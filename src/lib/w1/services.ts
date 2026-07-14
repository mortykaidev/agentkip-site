import { createHash } from "node:crypto";
import { CLAIM_IP_ATTEMPT_LIMIT, CLAIM_RATE_WINDOW_MS, CLAIM_SUBJECT_SUCCESS_LIMIT, CLAIM_TTL_MS, REVOKE_PRINCIPAL_LIMIT, ENTITLEMENT_PRODUCT, IDEMPOTENCY_TTL_MS, nodeClock, nodeMonotonicClock, nodeRandom, nodeSleeper, noopLogger, type W1Clock, type W1Logger, type W1MonotonicClock, type W1Random, type W1Sleeper } from "./constants";
import { deriveStripeIdempotencyKey, generateClaim, hashClaim, parseClaim } from "./crypto";
import { mapUnexpectedError, w1Error } from "./errors";
import { decideIdempotency, idempotencyWindow, type IdempotencyRecord, type MetadataForRoute } from "./idempotency";
import type { ClaimRow, EntitlementViewRow, W1Repository } from "./repository";
import { webhookRepositoryTx } from "./repository";
import { createW1Repository } from "./repository";
import { createW1Database } from "./db";
import { createStripeCheckoutGateway, createStripeWebhookGateway, type StripeCheckoutPort, type StripeWebhookPort, type VerifiedStripeEnvelope } from "./stripe";
import { loadCheckoutConfig, loadClaimConfig, loadEntitlementConfig, loadRedeemConfig, loadWebhookConfig } from "./config";
import { classifySupportedEvent, eventPrecedence, evaluateWebhookAuthority } from "./webhook";

export interface CheckoutResponse { checkoutUrl: string; expiresAt: string; }
export interface EntitlementResponse { entitlement: { product: "tester"; status: "inactive" | "pending" | "active" | "past_due" | "revoked"; source: "stripe_subscription" | null; granted_at: string | null; revoked_at: string | null; updated_at: string | null; }; }
export interface ClaimIssueResponse { claim_id: string; claim: string; expires_at: string; replayable: false; }
export interface ClaimRevokeResponse { claim_id: string; status: "revoked" | "expired"; expires_at: string; replayable: false; reissue_path: string; }
export interface ClaimRedeemResponse { redemption_id: string; subject: string; entitlement: string; product: "tester"; }
export interface CheckoutAuthority { readonly priceId: string; readonly productId: string; }
export interface CheckoutAuthorityResolver { resolve(): CheckoutAuthority; }
interface W1BaseRequestScope { repository: W1Repository; close(): Promise<void>; }
export interface W1CheckoutRequestScope extends W1BaseRequestScope { checkoutAuthority: CheckoutAuthorityResolver; checkoutStripe: StripeCheckoutPort; }
export interface W1WebhookRequestScope extends W1BaseRequestScope { webhookStripe: StripeWebhookPort; webhookLogger?: W1Logger; }
export interface W1ClaimRequestScope extends W1BaseRequestScope { claimPepper: string; rateLimitPepper: string; }
export interface W1RedeemRequestScope extends W1ClaimRequestScope { internalBearer: string; }
export type W1EntitlementRequestScope = W1BaseRequestScope;
export type W1RequestScope = W1CheckoutRequestScope | W1WebhookRequestScope | W1ClaimRequestScope | W1RedeemRequestScope | W1EntitlementRequestScope;
export interface W1RequestScopeFactory {
  create(kind: "checkout"): Promise<W1CheckoutRequestScope>;
  create(kind: "webhook"): Promise<W1WebhookRequestScope>;
  create(kind: "claim"): Promise<W1ClaimRequestScope>;
  create(kind: "redeem"): Promise<W1RedeemRequestScope>;
  create(kind: "entitlement"): Promise<W1EntitlementRequestScope>;
}
export interface W1ServiceDependencies { repository: W1Repository; checkoutAuthority?: CheckoutAuthorityResolver; checkoutStripe?: StripeCheckoutPort; webhookStripe?: StripeWebhookPort; clock?: W1Clock; random?: W1Random; monotonic?: W1MonotonicClock; sleeper?: W1Sleeper; claimPepper?: string; rateLimitPepper?: string; logger?: W1Logger; }
export type IdempotencyPreflight<R extends "/api/billing/checkout" | "/api/bootstrap-claims" | "/api/bootstrap-claims/[claim_id]/revoke" | "/api/bootstrap-claims/[claim_id]/reissue"> = { kind: "completed"; metadata: MetadataForRoute<R> } | { kind: "reserved"; id: string };
export interface W1Services { inspectIdempotency<R extends "/api/billing/checkout" | "/api/bootstrap-claims" | "/api/bootstrap-claims/[claim_id]/revoke" | "/api/bootstrap-claims/[claim_id]/reissue">(subject: string, route: R, key: string, digest: string): Promise<MetadataForRoute<R> | null>; preflightIdempotency<R extends "/api/billing/checkout" | "/api/bootstrap-claims" | "/api/bootstrap-claims/[claim_id]/revoke" | "/api/bootstrap-claims/[claim_id]/reissue">(subject: string, route: R, key: string, digest: string): Promise<IdempotencyPreflight<R>>; checkout(subject: string, key: string, digest: string): Promise<CheckoutResponse>; getEntitlement(subject: string): Promise<EntitlementResponse>; issueClaim(subject: string, key: string, digest: string, sourceIpHash: string): Promise<ClaimIssueResponse>; revokeClaim(subject: string, claimId: string, key: string, digest: string): Promise<ClaimRevokeResponse>; reissueClaim(subject: string, claimId: string, key: string, digest: string, sourceIpHash: string): Promise<ClaimIssueResponse>; redeemClaim(claim: string): Promise<ClaimRedeemResponse>; handleWebhook(envelope: VerifiedStripeEnvelope, requestId: string): Promise<{ received: true }>; }
const iso = (date: Date) => date.toISOString();
const recovery = (claim: ClaimRow): MetadataForRoute<"/api/bootstrap-claims"> => {
  if (claim.status !== "active") throw new TypeError("invalid active claim recovery");
  return { claim_id: claim.id, status: "active", expires_at: iso(claim.expiresAt), replayable: false, revoke_path: "/api/bootstrap-claims/" + claim.id + "/revoke", reissue_path: "/api/bootstrap-claims/" + claim.id + "/reissue" };
};
const claimHashKey = (value: string) => createHash("sha256").update(value).digest("hex");
const exactValues = (value: unknown, keys: readonly string[], label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype || Reflect.ownKeys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) throw new TypeError(label);
  for (const key of keys) { const descriptor = Object.getOwnPropertyDescriptor(value, key); if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) throw new TypeError(label); }
  return value as Record<string, unknown>;
};
const authorityOf = (resolver: CheckoutAuthorityResolver): CheckoutAuthority => {
  const value = exactValues(resolver.resolve(), ["priceId", "productId"], "invalid checkout authority");
  if (typeof value.priceId !== "string" || typeof value.productId !== "string" || !/^price_[A-Za-z0-9]+$/.test(value.priceId) || !/^prod_[A-Za-z0-9]+$/.test(value.productId)) throw new TypeError("invalid checkout authority");
  return { priceId: value.priceId, productId: value.productId };
};
const assertIntent = (value: unknown, requestId: string, subject: string, authority: CheckoutAuthority) => {
  const intent = exactValues(value, ["id", "requestIdempotencyId", "clerkSubject", "product", "configuredPriceId", "configuredStripeProductId", "stripeCustomerId", "stripeCheckoutSessionId", "stripeSubscriptionId"], "checkout intent disagreement");
  if (typeof intent.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(intent.id) || intent.requestIdempotencyId !== requestId || intent.clerkSubject !== subject || intent.product !== ENTITLEMENT_PRODUCT || intent.configuredPriceId !== authority.priceId || intent.configuredStripeProductId !== authority.productId || (intent.stripeCustomerId !== null && (typeof intent.stripeCustomerId !== "string" || !/^cus_[A-Za-z0-9]+$/.test(intent.stripeCustomerId))) || (intent.stripeCheckoutSessionId !== null && (typeof intent.stripeCheckoutSessionId !== "string" || !/^cs_test_[A-Za-z0-9]+$/.test(intent.stripeCheckoutSessionId))) || (intent.stripeSubscriptionId !== null && (typeof intent.stripeSubscriptionId !== "string" || !/^sub_[A-Za-z0-9]+$/.test(intent.stripeSubscriptionId)))) throw new Error("checkout intent disagreement");
  if ((intent.stripeCustomerId === null && (intent.stripeCheckoutSessionId !== null || intent.stripeSubscriptionId !== null)) || (intent.stripeCustomerId !== null && ((intent.stripeCheckoutSessionId === null) !== (intent.stripeSubscriptionId === null)))) throw new Error("checkout intent disagreement");
  return intent as { id: string; requestIdempotencyId: string; clerkSubject: string; product: typeof ENTITLEMENT_PRODUCT; configuredPriceId: string; configuredStripeProductId: string; stripeCustomerId: string | null; stripeCheckoutSessionId: string | null; stripeSubscriptionId: string | null; };
};
const assertCustomer = (value: unknown, subject: string) => {
  const row = exactValues(value, ["customerId", "livemode", "deleted", "metadata"], "invalid Stripe customer");
  const metadata = exactValues(row.metadata, ["agentkip_schema", "clerk_subject"], "invalid Stripe customer");
  if (typeof row.customerId !== "string" || !/^cus_[A-Za-z0-9]+$/.test(row.customerId) || row.livemode !== false || row.deleted !== false || metadata.agentkip_schema !== "1" || metadata.clerk_subject !== subject) throw new Error("customer provider disagreement");
  return { customerId: row.customerId };
};
const assertCustomerMapping = (value: unknown, subject: string, expectedCustomerId?: string) => {
  const row = exactValues(value, ["clerkSubject", "stripeCustomerId"], "customer mapping disagreement");
  if (row.clerkSubject !== subject || typeof row.stripeCustomerId !== "string" || !/^cus_[A-Za-z0-9]+$/.test(row.stripeCustomerId) || (expectedCustomerId !== undefined && row.stripeCustomerId !== expectedCustomerId)) throw new Error("customer mapping disagreement");
  return { clerkSubject: subject, stripeCustomerId: row.stripeCustomerId };
};
const hostedCheckoutUrl = (value: unknown): string => {
  if (typeof value !== "string" || !value.startsWith("https://checkout.stripe.com/")) throw new Error("checkout provider disagreement");
  let parsed: URL; try { parsed = new URL(value); } catch { throw new Error("checkout provider disagreement"); }
  if (parsed.protocol !== "https:" || parsed.origin !== "https://checkout.stripe.com" || parsed.hostname !== "checkout.stripe.com" || parsed.host !== "checkout.stripe.com" || parsed.port !== "" || parsed.username !== "" || parsed.password !== "" || parsed.href !== value || !parsed.pathname.startsWith("/")) throw new Error("checkout provider disagreement");
  return value;
};
const exactMetadata = (value: Record<string, unknown>, expected: Record<string, string>) => Object.keys(expected).every((key) => value[key] === expected[key]);
const assertCheckout = (value: unknown, intent: { id: string }, customerId: string, subject: string, authority: CheckoutAuthority) => {
  const row = exactValues(value, ["sessionId", "subscriptionId", "customerId", "priceId", "productId", "checkoutUrl", "createdAt", "expiresAt", "livemode", "mode", "quantity", "metadata", "subscriptionMetadata"], "invalid Stripe checkout");
  const expectedMetadata = { agentkip_schema: "1", agentkip_product: ENTITLEMENT_PRODUCT, clerk_subject: subject, checkout_request_id: intent.id };
  const metadata = exactValues(row.metadata, Object.keys(expectedMetadata), "invalid Stripe checkout");
  const subscriptionMetadata = exactValues(row.subscriptionMetadata, Object.keys(expectedMetadata), "invalid Stripe checkout");
  if (typeof row.sessionId !== "string" || !/^cs_test_[A-Za-z0-9]+$/.test(row.sessionId) || typeof row.subscriptionId !== "string" || !/^sub_[A-Za-z0-9]+$/.test(row.subscriptionId) || row.customerId !== customerId || row.priceId !== authority.priceId || row.productId !== authority.productId || !(row.createdAt instanceof Date) || !(row.expiresAt instanceof Date) || !Number.isFinite(row.createdAt.getTime()) || !Number.isFinite(row.expiresAt.getTime()) || row.createdAt.getTime() <= 0 || row.expiresAt.getTime() <= 0 || row.createdAt.getMilliseconds() !== 0 || row.expiresAt.getMilliseconds() !== 0 || row.expiresAt.getTime() - row.createdAt.getTime() !== 86_400_000 || row.livemode !== false || row.mode !== "subscription" || row.quantity !== 1 || !exactMetadata(metadata, expectedMetadata) || !exactMetadata(subscriptionMetadata, expectedMetadata)) throw new Error("checkout provider disagreement");
  return { sessionId: row.sessionId, subscriptionId: row.subscriptionId, checkoutUrl: hostedCheckoutUrl(row.checkoutUrl), expiresAt: new Date(row.expiresAt.getTime()) };
};
const assertProcessingCheckoutRecord = (value: unknown, id: string, subject: string, key: string, digest: string): IdempotencyRecord<"/api/billing/checkout"> => {
  const record = exactValues(value, ["id", "route", "principal", "idempotencyKey", "requestDigest", "status", "responseStatus", "responseMetadata", "lockedUntil", "expiresAt"], "checkout idempotency disagreement");
  if (record.id !== id || record.route !== "/api/billing/checkout" || record.principal !== subject || record.idempotencyKey !== key || record.requestDigest !== digest || record.status !== "processing" || record.responseStatus !== null || record.responseMetadata !== null || !(record.lockedUntil instanceof Date) || !(record.expiresAt instanceof Date) || !Number.isFinite(record.lockedUntil.getTime()) || !Number.isFinite(record.expiresAt.getTime())) throw new Error("checkout idempotency disagreement");
  return {
    id,
    route: "/api/billing/checkout",
    principal: subject,
    idempotencyKey: key,
    requestDigest: digest,
    status: "processing",
    responseStatus: null,
    responseMetadata: null,
    lockedUntil: new Date(record.lockedUntil.getTime()),
    expiresAt: new Date(record.expiresAt.getTime()),
  };
};
export function createW1Services(deps: W1ServiceDependencies): W1Services {
  const clock = deps.clock ?? nodeClock; const random = deps.random ?? nodeRandom; const monotonic = deps.monotonic ?? nodeMonotonicClock; const sleeper = deps.sleeper ?? nodeSleeper; const logger = deps.logger ?? noopLogger;
  const inspectIdempotency: W1Services["inspectIdempotency"] = async (subject, route, key, digest) => deps.repository.transaction(async (tx) => {
    const record = await tx.readIdempotency(route, subject, key);
    if (!record) return null;
    const decision = decideIdempotency(record, digest, clock.now());
    return decision.kind === "completed" ? decision.record.responseMetadata : null;
  });
  const preflightIdempotency: W1Services["preflightIdempotency"] = async (subject, route, key, digest) => {
    try { await deps.repository.cleanupExpiredProcessingIdempotency(clock.now()); } catch { /* cleanup is deliberately outside the core transaction */ }
    return deps.repository.transaction(async (tx) => {
    const now = clock.now();
    const decideExisting = async (): Promise<IdempotencyPreflight<typeof route> | null> => {
      const record = await tx.readIdempotency(route, subject, key);
      if (!record) return null;
      const decision = decideIdempotency(record, digest, now);
      if (decision.kind === "completed") return { kind: "completed", metadata: decision.record.responseMetadata };
      if (decision.kind === "reacquire") {
        if (await tx.reacquireIdempotency(record.id, idempotencyWindow(now).lockedUntil, now)) return { kind: "reserved", id: record.id };
        return null;
      }
      return null;
    };
    const existing = await decideExisting();
    if (existing) return existing;
    const reserved = await tx.reserveIdempotency({ route, principal: subject, idempotencyKey: key, requestDigest: digest, ...idempotencyWindow(now) });
    if (reserved) return { kind: "reserved", id: reserved.id };
    const raced = await decideExisting();
    if (raced) return raced;
    throw new Error("idempotency reservation did not resolve");
    });
  };
  return {
    inspectIdempotency,
    preflightIdempotency,
    async checkout(subject, key, digest) { try {
      const route = "/api/billing/checkout" as const;
      const stripe = deps.checkoutStripe;
      const resolver = deps.checkoutAuthority;
      if (!stripe || !resolver) throw new Error("checkout dependencies unavailable");
      const authority = authorityOf(resolver);
      const beginning = await deps.repository.transaction(async (tx) => {
        const entitlement = await tx.lockEntitlement(subject);
        const now = clock.now();
        const resolve = async (): Promise<IdempotencyPreflight<typeof route> | null> => {
          const record = await tx.readIdempotency(route, subject, key);
          const decision = decideIdempotency(record, digest, now);
          if (decision.kind === "completed") return { kind: "completed", metadata: decision.record.responseMetadata };
          if (decision.kind === "reacquire") {
            if (record && await tx.reacquireIdempotency(record.id, idempotencyWindow(now).lockedUntil, now)) return { kind: "reserved", id: record.id };
            return null;
          }
          return null;
        };
        const existing = await resolve();
        if (existing?.kind === "completed") return existing;
        if (entitlement?.status === "active") throw w1Error("entitlement_already_active");
        if (existing) {
          const intent = await tx.readIntentByIdempotency(existing.id) ?? await tx.insertIntent({ requestIdempotencyId: existing.id, clerkSubject: subject, product: ENTITLEMENT_PRODUCT, configuredPriceId: authority.priceId, configuredStripeProductId: authority.productId });
          assertIntent(intent, existing.id, subject, authority);
          return { ...existing, intent };
        }
        const reserved = await tx.reserveIdempotency({ route, principal: subject, idempotencyKey: key, requestDigest: digest, ...idempotencyWindow(now) });
        if (reserved) {
          const intent = await tx.insertIntent({ requestIdempotencyId: reserved.id, clerkSubject: subject, product: ENTITLEMENT_PRODUCT, configuredPriceId: authority.priceId, configuredStripeProductId: authority.productId });
          assertIntent(intent, reserved.id, subject, authority);
          return { kind: "reserved" as const, id: reserved.id, intent, expiresAt: reserved.expiresAt };
        }
        const raced = await resolve();
        if (raced?.kind === "completed") return raced;
        if (raced) {
          const intent = await tx.readIntentByIdempotency(raced.id) ?? await tx.insertIntent({ requestIdempotencyId: raced.id, clerkSubject: subject, product: ENTITLEMENT_PRODUCT, configuredPriceId: authority.priceId, configuredStripeProductId: authority.productId });
          assertIntent(intent, raced.id, subject, authority);
          return { ...raced, intent };
        }
        throw new Error("idempotency reservation did not resolve");
      });
      if (beginning.kind === "completed") return { checkoutUrl: beginning.metadata.checkoutUrl, expiresAt: beginning.metadata.expiresAt };
      const intent = beginning.intent;
      assertIntent(intent, beginning.id, subject, authority);
      const beforeValidation = await deps.repository.transaction((tx) => tx.readIntentByIdempotency(beginning.id));
      if (!beforeValidation) throw new Error("checkout intent disagreement");
      const checkedBeforeValidation = assertIntent(beforeValidation, beginning.id, subject, authority);
      if (checkedBeforeValidation.stripeCheckoutSessionId !== null || checkedBeforeValidation.stripeSubscriptionId !== null) throw new Error("checkout intent disagreement");
      await stripe.validateConfiguredPrice(authority);
      const customer = await deps.repository.transaction(async (tx) => {
        await tx.acquireAdvisoryLock("customer:" + claimHashKey(subject));
        const current = await tx.readIntentByIdempotency(beginning.id); if (!current) throw new Error("checkout intent disagreement");
        const checkedCurrent = assertIntent(current, beginning.id, subject, authority);
        if (checkedCurrent.stripeCheckoutSessionId !== null || checkedCurrent.stripeSubscriptionId !== null) throw new Error("checkout intent disagreement");
        const existing = await tx.readCustomer(subject);
        let mapped = existing === null ? null : assertCustomerMapping(existing, subject);
        if (checkedCurrent.stripeCustomerId === null) {
          if (!mapped) {
            const created = assertCustomer(await stripe.createCustomer({ subject }, deriveStripeIdempotencyKey("customer", subject)), subject);
            await tx.insertCustomer(subject, created.customerId);
            mapped = assertCustomerMapping(await tx.readCustomer(subject), subject, created.customerId);
          }
        } else {
          if (!mapped || mapped.stripeCustomerId !== checkedCurrent.stripeCustomerId) throw new Error("customer mapping disagreement");
        }
        if (!mapped) throw new Error("customer mapping disagreement");
        const linked = assertIntent(await tx.setIntentCustomer(intent.id, mapped.stripeCustomerId), beginning.id, subject, authority);
        if (linked.stripeCustomerId !== mapped.stripeCustomerId || linked.stripeCheckoutSessionId !== null || linked.stripeSubscriptionId !== null) throw new Error("checkout intent disagreement");
        return mapped;
      });
      const beforeCheckout = await deps.repository.transaction((tx) => tx.readIntentByIdempotency(beginning.id));
      if (!beforeCheckout) throw new Error("checkout intent disagreement");
      const checkedBeforeCheckout = assertIntent(beforeCheckout, beginning.id, subject, authority);
      if (checkedBeforeCheckout.stripeCustomerId !== customer.stripeCustomerId || checkedBeforeCheckout.stripeCheckoutSessionId !== null || checkedBeforeCheckout.stripeSubscriptionId !== null) throw new Error("checkout intent disagreement");
      const result = assertCheckout(await stripe.createCheckout({ customerId: customer.stripeCustomerId, subject, requestId: intent.id, authority }, deriveStripeIdempotencyKey("checkout", intent.id)), intent, customer.stripeCustomerId, subject, authority);
      const response = { checkoutUrl: result.checkoutUrl, expiresAt: iso(result.expiresAt) };
      await deps.repository.transaction(async (tx) => {
        const record = await tx.readIdempotency(route, subject, key);
        if (!record) throw new Error("checkout idempotency disagreement");
        assertProcessingCheckoutRecord(record, beginning.id, subject, key, digest);
        const persisted = await tx.readIntentByIdempotency(beginning.id);
        if (!persisted) throw new Error("checkout intent disagreement");
        const checkedPersisted = assertIntent(persisted, beginning.id, subject, authority);
        if (checkedPersisted.id !== intent.id || checkedPersisted.stripeCustomerId !== customer.stripeCustomerId || checkedPersisted.stripeCheckoutSessionId !== null || checkedPersisted.stripeSubscriptionId !== null) throw new Error("checkout intent disagreement");
        const updated = assertIntent(await tx.setIntentCheckout(intent.id, result.sessionId, result.subscriptionId), beginning.id, subject, authority);
        if (updated.stripeCustomerId !== customer.stripeCustomerId || updated.stripeCheckoutSessionId !== result.sessionId || updated.stripeSubscriptionId !== result.subscriptionId) throw new Error("checkout intent disagreement");
        await tx.completeIdempotency(beginning.id, route, 200, response);
      });
      return response;
    } catch (error) { if (error instanceof Error && "code" in error) throw error; throw mapUnexpectedError("billing"); } },
    async getEntitlement(subject) { try { const row = await deps.repository.readEntitlement(subject); return { entitlement: row ? { product: "tester", status: row.status, source: "stripe_subscription", granted_at: row.grantedAt ? iso(row.grantedAt) : null, revoked_at: row.revokedAt ? iso(row.revokedAt) : null, updated_at: iso(row.updatedAt) } : { product: "tester", status: "inactive", source: null, granted_at: null, revoked_at: null, updated_at: null } }; } catch { throw mapUnexpectedError("entitlement"); } },
    async issueClaim(subject, key, digest, sourceIpHash) { try { const claimPepper = deps.claimPepper; if (!claimPepper || !deps.rateLimitPepper) throw new Error("claim configuration unavailable"); const token = generateClaim(random); const response = await deps.repository.transaction(async (tx) => { const entitlement = await tx.lockEntitlement(subject); if (!entitlement || entitlement.status !== "active") throw w1Error("active_entitlement_required"); const reservation = await tx.readIdempotency("/api/bootstrap-claims", subject, key); const decision = decideIdempotency(reservation, digest, clock.now()); if (decision.kind === "completed") { const current = await tx.lockClaim(decision.record.responseMetadata.claim_id); if (current?.status === "active") throw Object.assign(w1Error("claim_secret_not_replayable"), { claim: recovery(current) }); throw w1Error("claim_secret_not_replayable"); } const attempts = await tx.countRecentAttempts(sourceIpHash); if (attempts >= CLAIM_IP_ATTEMPT_LIMIT) throw w1Error("claim_issuance_limited"); await tx.insertAttempt(sourceIpHash, "issue"); const successes = await tx.countRecentClaims(subject, entitlement.id); if (successes >= CLAIM_SUBJECT_SUCCESS_LIMIT) throw w1Error("claim_issuance_limited"); const current = await tx.lockCurrentClaim(subject, entitlement.id); if (current && current.expiresAt.getTime() > clock.now().getTime()) throw Object.assign(w1Error("live_claim_exists"), { claim: recovery(current) }); if (current) await tx.updateClaim({ ...current, status: "expired", consumedAt: null, redemptionId: null, revokedAt: null, revokeReason: null }); const expiresAt = new Date(clock.now().getTime() + CLAIM_TTL_MS); const row: ClaimRow = { id: token.id, entitlementId: entitlement.id, clerkSubject: subject, product: ENTITLEMENT_PRODUCT, claimHash: hashClaim(token.claim, claimPepper), pepperVersion: 1, status: "active", expiresAt, redemptionId: null, consumedAt: null, revokedAt: null, revokeReason: null }; await tx.insertClaim(row); const inserted = reservation ?? await tx.reserveIdempotency({ route: "/api/bootstrap-claims", principal: subject, idempotencyKey: key, requestDigest: digest, ...idempotencyWindow(clock.now()) }); if (!inserted) throw new Error("idempotency reservation did not resolve"); await tx.completeIdempotency(inserted.id, "/api/bootstrap-claims", 201, recovery(row)); return { claim_id: row.id, claim: token.claim, expires_at: iso(expiresAt), replayable: false as const }; }); return response; } catch (error) { if (error instanceof Error && "code" in error) throw error; throw mapUnexpectedError("claim"); } },
    async revokeClaim(subject, claimId, key, digest) { try { return await deps.repository.transaction(async (tx): Promise<ClaimRevokeResponse> => { await tx.acquireAdvisoryLock("claim-revoke:" + claimHashKey(subject)); const claim = await tx.lockClaim(claimId); if (!claim || claim.clerkSubject !== subject) throw w1Error("claim_not_found"); if (claim.status === "consumed") throw w1Error("claim_already_consumed"); const count = await tx.countRecentRevokes(subject); if (count >= REVOKE_PRINCIPAL_LIMIT) throw w1Error("claim_issuance_limited"); const decision = decideIdempotency(await tx.readIdempotency("/api/bootstrap-claims/[claim_id]/revoke", subject, key), digest, clock.now()); if (decision.kind !== "completed" && claim.status === "active") await tx.updateClaim({ ...claim, status: "revoked", revokedAt: clock.now(), revokeReason: "delivery_uncertain" }); const next: "revoked" | "expired" = claim.status === "expired" ? "expired" : "revoked"; const metadata: ClaimRevokeResponse = { claim_id: claim.id, status: next, expires_at: iso(claim.expiresAt), replayable: false, reissue_path: "/api/bootstrap-claims/" + claim.id + "/reissue" }; if (decision.kind !== "completed") { const inserted = await tx.reserveIdempotency({ route: "/api/bootstrap-claims/[claim_id]/revoke", principal: subject, idempotencyKey: key, requestDigest: digest, ...idempotencyWindow(clock.now()) }); if (!inserted) throw new Error("idempotency reservation did not resolve"); await tx.completeIdempotency(inserted.id, "/api/bootstrap-claims/[claim_id]/revoke", 200, metadata); } return metadata; }); } catch (error) { if (error instanceof Error && "code" in error) throw error; throw mapUnexpectedError("claim"); } },
    async reissueClaim(subject, claimId, key, digest, sourceIpHash) { try {
      const claimPepper = deps.claimPepper;
      if (!claimPepper || !deps.rateLimitPepper) throw new Error("claim configuration unavailable");
      return await deps.repository.transaction(async (tx): Promise<ClaimIssueResponse> => {
        const now = clock.now();
        const route = "/api/bootstrap-claims/[claim_id]/reissue" as const;
        const entitlement = await tx.lockEntitlement(subject);
        if (!entitlement || entitlement.status !== "active") throw w1Error("active_entitlement_required");
        const source = await tx.lockClaim(claimId);
        if (!source || source.clerkSubject !== subject || source.entitlementId !== entitlement.id) throw w1Error("claim_not_found");

        const existing = await tx.readIdempotency(route, subject, key);
        const decision = decideIdempotency(existing, digest, now);
        if (decision.kind === "completed") {
          const replacement = await tx.lockClaim(decision.record.responseMetadata.claim_id);
          if (replacement && replacement.clerkSubject === subject && replacement.entitlementId === entitlement.id && replacement.status === "active" && replacement.expiresAt.getTime() > now.getTime()) {
            throw Object.assign(w1Error("claim_secret_not_replayable"), { claim: recovery(replacement) });
          }
          throw w1Error("claim_secret_not_replayable");
        }
        let reservation = existing;
        if (decision.kind === "reacquire") {
          if (!existing || !await tx.reacquireIdempotency(existing.id, idempotencyWindow(now).lockedUntil, now)) throw new Error("idempotency reservation did not resolve");
        } else {
          reservation = await tx.reserveIdempotency({ route, principal: subject, idempotencyKey: key, requestDigest: digest, ...idempotencyWindow(now) });
          if (!reservation) throw new Error("idempotency reservation did not resolve");
        }
        if (!reservation) throw new Error("idempotency reservation did not resolve");
        if (source.status === "consumed") throw w1Error("claim_already_consumed");

        const attempts = await tx.countRecentAttempts(sourceIpHash);
        if (attempts >= CLAIM_IP_ATTEMPT_LIMIT) throw w1Error("claim_issuance_limited");
        await tx.insertAttempt(sourceIpHash, "reissue");
        const successes = await tx.countRecentClaims(subject, entitlement.id);
        if (successes >= CLAIM_SUBJECT_SUCCESS_LIMIT) throw w1Error("claim_issuance_limited");

        const current = await tx.lockCurrentClaim(subject, entitlement.id);
        if (current && current.id !== source.id) {
          if (current.expiresAt.getTime() > now.getTime()) throw Object.assign(w1Error("live_claim_exists"), { claim: recovery(current) });
          await tx.updateClaim({ ...current, status: "expired", consumedAt: null, redemptionId: null, revokedAt: null, revokeReason: null });
        }
        if (source.status === "active") {
          if (source.expiresAt.getTime() > now.getTime()) {
            await tx.updateClaim({ ...source, status: "revoked", consumedAt: null, redemptionId: null, revokedAt: now, revokeReason: "delivery_uncertain" });
          } else {
            await tx.updateClaim({ ...source, status: "expired", consumedAt: null, redemptionId: null, revokedAt: null, revokeReason: null });
          }
        }

        const token = generateClaim(random);
        const expiresAt = new Date(now.getTime() + CLAIM_TTL_MS);
        const row: ClaimRow = { id: token.id, entitlementId: entitlement.id, clerkSubject: subject, product: ENTITLEMENT_PRODUCT, claimHash: hashClaim(token.claim, claimPepper), pepperVersion: 1, status: "active", expiresAt, redemptionId: null, consumedAt: null, revokedAt: null, revokeReason: null };
        await tx.insertClaim(row);
        await tx.completeIdempotency(reservation.id, route, 201, recovery(row));
        return { claim_id: row.id, claim: token.claim, expires_at: iso(expiresAt), replayable: false };
      });
    } catch (error) { if (error instanceof Error && "code" in error) throw error; throw mapUnexpectedError("claim"); } },
    async redeemClaim(claim) { const started = monotonic.now(); const parsed = parseClaim(claim); if (!parsed) throw w1Error("invalid_request"); try { const claimPepper = deps.claimPepper; if (!claimPepper) throw new Error("claim configuration unavailable"); const result = await deps.repository.transaction(async (tx) => { await tx.acquireAdvisoryLock("claim-redeem:" + claimHashKey(parsed.id)); const row = await tx.lockClaim(parsed.id); const digest = hashClaim(claim, claimPepper); const valid = row && row.status === "active" && row.claimHash === digest && row.expiresAt.getTime() > clock.now().getTime(); if (!valid) return null; const entitlement = await tx.lockEntitlement(row.clerkSubject); if (!entitlement || entitlement.status !== "active") return null; const redemption = await tx.consumeClaim(row.id); return redemption ? { redemption_id: redemption.toLowerCase(), subject: row.clerkSubject, entitlement: row.entitlementId, product: "tester" as const } : null; }); if (!result) { await sleeper.sleep(Math.max(0, 75 - (monotonic.now() - started))); throw w1Error("claim_not_found"); } return result; } catch (error) { if (error instanceof Error && "code" in error) throw error; throw mapUnexpectedError("claim"); } },
    async handleWebhook(envelope, requestId) {
      const stripe = deps.webhookStripe;
      if (!stripe || !/^evt_[A-Za-z0-9_]+$/.test(envelope.id) || !Number.isFinite(envelope.createdAt.getTime())) throw mapUnexpectedError("webhook");
      type Result = { status: "processed" | "ignored" | "terminal_failed" | "retryable_failed"; duplicate: boolean; attemptCount: number; failureCode?: import("./constants").StripeFailureCode };
      const terminal = (event: import("./repository").WebhookEventRow, duplicate: boolean): Result => ({ status: event.status as Result["status"], duplicate, attemptCount: event.attemptCount, ...(event.failureCode ? { failureCode: event.failureCode } : {}) });
      const immutable = (event: import("./repository").WebhookEventRow) => event.eventType === envelope.type && event.eventCreatedAt.getTime() === envelope.createdAt.getTime();
      const supported = classifySupportedEvent(envelope.type);
      let result: Result;
      let authorityLoaded = false;
      try {
        const initial = await deps.repository.transaction(async (tx): Promise<Result | null> => {
          const capability = webhookRepositoryTx(tx); if (!capability) throw new Error("webhook repository capability unavailable");
          const inserted = await tx.insertEvent({ stripeEventId: envelope.id, eventType: envelope.type, eventCreatedAt: envelope.createdAt, status: "received", attemptCount: 0, failureCode: null }); const event = await capability.lockStripeEvent(envelope.id);
          if (!event || !immutable(event)) throw new Error("webhook event immutable disagreement");
          if (!inserted && (event.status === "processed" || event.status === "ignored" || event.status === "terminal_failed")) return terminal(event, true);
          if (!supported) { const ignored = await capability.updateWebhookEvent({ ...event, status: "ignored", attemptCount: event.attemptCount + 1, processedAt: clock.now(), nextRetryAt: null, failureCode: null }); return terminal(ignored, !inserted); }
          return null;
        });
        if (initial) result = initial;
        else if (!supported) throw new Error("unsupported event was not terminalized");
        else result = await deps.repository.transaction(async (tx): Promise<Result> => {
          const capability = webhookRepositoryTx(tx); if (!capability) throw new Error("webhook repository capability unavailable");
          await tx.acquireAdvisoryLock("stripe-event:" + envelope.id);
          const beforeRead = await capability.readWebhookEvent(envelope.id);
          if (!beforeRead || !immutable(beforeRead)) throw new Error("webhook event immutable disagreement");
          if (beforeRead.status === "processed" || beforeRead.status === "ignored" || beforeRead.status === "terminal_failed") return terminal(beforeRead, true);
          let authority;
          try { authority = await stripe.loadAuthorityBundle(envelope); } catch {
            const locked = await capability.lockStripeEvent(envelope.id); if (!locked || !immutable(locked)) throw new Error("webhook event immutable disagreement");
            if (locked.status === "processed" || locked.status === "ignored" || locked.status === "terminal_failed") return terminal(locked, true);
            const failed = await capability.updateWebhookEvent({ ...locked, status: "retryable_failed", attemptCount: locked.attemptCount + 1, processedAt: null, nextRetryAt: new Date(clock.now().getTime() + 60_000), failureCode: "stripe_read_retryable" });
            return terminal(failed, false);
          }
          authorityLoaded = true;
          const locked = await capability.lockStripeEvent(envelope.id); if (!locked || !immutable(locked)) throw new Error("webhook event immutable disagreement");
          if (locked.status === "processed" || locked.status === "ignored" || locked.status === "terminal_failed") return terminal(locked, true);
          const attemptCount = locked.attemptCount + 1; const outcome = evaluateWebhookAuthority(envelope, authority);
          const fail = async (failureCode: import("./constants").StripeFailureCode): Promise<Result> => terminal(await capability.updateWebhookEvent({ ...locked, status: "terminal_failed", attemptCount, processedAt: clock.now(), nextRetryAt: null, failureCode }), false);
          if (!authority.valid || outcome.status === null || !authority.clerkSubject || !authority.checkoutRequestId || !authority.priceId || !authority.productId || !authority.reference.customerId || !authority.reference.subscriptionId || !authority.reference.sessionId) return fail(authority.failureCode ?? "malformed_supported_object");
          const intent = await capability.lockIntentByStripeReferences(authority.reference.sessionId, authority.reference.subscriptionId);
          if (!intent) return fail("unknown_intent");
          if (intent.id !== authority.checkoutRequestId || intent.clerkSubject !== authority.clerkSubject || intent.configuredPriceId !== authority.priceId || intent.configuredStripeProductId !== authority.productId || intent.stripeCustomerId !== authority.reference.customerId || intent.stripeCheckoutSessionId !== authority.reference.sessionId || intent.stripeSubscriptionId !== authority.reference.subscriptionId) return fail("identifier_mismatch");
          const customer = await tx.readCustomer(intent.clerkSubject); if (!customer) return fail("unknown_customer");
          if (customer.stripeCustomerId !== authority.reference.customerId) return fail("identifier_mismatch");
          const reasonCode = supported === "checkout.session.completed" ? "checkout_completed" : supported === "customer.subscription.created" ? "subscription_created" : supported === "customer.subscription.updated" ? "subscription_updated" : supported === "customer.subscription.deleted" ? "subscription_deleted" : supported === "invoice.paid" ? "invoice_paid" : "invoice_payment_failed";
          const entitlement = await capability.applyWebhookEntitlement({ clerkSubject: intent.clerkSubject, customerId: authority.reference.customerId, sessionId: authority.reference.sessionId, subscriptionId: authority.reference.subscriptionId, status: outcome.status, eventId: envelope.id, eventCreatedAt: envelope.createdAt, eventPrecedence: eventPrecedence(supported), reasonCode });
          if (entitlement.applied && entitlement.entitlement.status !== "active") await tx.revokeActiveClaims(entitlement.entitlement.id);
          return terminal(await capability.updateWebhookEvent({ ...locked, status: "processed", attemptCount, processedAt: clock.now(), nextRetryAt: null, failureCode: null }), false);
        });
      } catch {
        if (!authorityLoaded) throw mapUnexpectedError("webhook");
        try {
          result = await deps.repository.transaction(async (tx): Promise<Result> => {
            const capability = webhookRepositoryTx(tx); if (!capability) throw new Error("webhook repository capability unavailable"); await tx.acquireAdvisoryLock("stripe-event:" + envelope.id); const event = await capability.lockStripeEvent(envelope.id);
            if (!event || !immutable(event)) throw new Error("webhook event immutable disagreement"); if (event.status === "processed" || event.status === "ignored" || event.status === "terminal_failed") return terminal(event, true);
            return terminal(await capability.updateWebhookEvent({ ...event, status: "retryable_failed", attemptCount: event.attemptCount + 1, processedAt: null, nextRetryAt: new Date(clock.now().getTime() + 60_000), failureCode: "database_retryable" }), false);
          });
        } catch { throw mapUnexpectedError("webhook"); }
      }
      try { logger.webhook({ requestId, eventId: envelope.id, eventType: envelope.type, status: result.status, duplicate: result.duplicate, attemptCount: result.attemptCount, ...(result.failureCode ? { failureCode: result.failureCode } : {}) }); } catch { /* observability never changes fulfillment */ }
      if (result.status === "retryable_failed") throw mapUnexpectedError("webhook"); return { received: true };
    },
  };
}
async function createProductionScope(kind: "checkout"): Promise<W1CheckoutRequestScope>;
async function createProductionScope(kind: "webhook"): Promise<W1WebhookRequestScope>;
async function createProductionScope(kind: "claim"): Promise<W1ClaimRequestScope>;
async function createProductionScope(kind: "redeem"): Promise<W1RedeemRequestScope>;
async function createProductionScope(kind: "entitlement"): Promise<W1EntitlementRequestScope>;
async function createProductionScope(kind: "entitlement" | "claim" | "redeem" | "checkout" | "webhook"): Promise<W1RequestScope> {
  if (kind === "checkout") {
    const config = loadCheckoutConfig();
    const repository = createW1Repository(createW1Database(config.databaseUrl));
    const checkoutAuthority: CheckoutAuthorityResolver = { resolve: () => ({ priceId: config.priceId, productId: config.productId }) };
    return { repository, checkoutAuthority, checkoutStripe: createStripeCheckoutGateway(config), close: () => repository.close() };
  }
  if (kind === "webhook") {
    const config = loadWebhookConfig();
    const repository = createW1Repository(createW1Database(config.databaseUrl));
    const webhookLogger: W1Logger = { webhook: (record) => { console.info(JSON.stringify(record)); } };
    return { repository, webhookStripe: createStripeWebhookGateway(config), webhookLogger, close: () => repository.close() };
  }
  if (kind === "claim") {
    const config = loadClaimConfig();
    const repository = createW1Repository(createW1Database(config.databaseUrl));
    return { repository, claimPepper: config.claimPepper, rateLimitPepper: config.rateLimitPepper, close: () => repository.close() };
  }
  if (kind === "redeem") {
    const config = loadRedeemConfig();
    const repository = createW1Repository(createW1Database(config.databaseUrl));
    return { repository, claimPepper: config.claimPepper, rateLimitPepper: config.rateLimitPepper, internalBearer: config.internalBearer, close: () => repository.close() };
  }
  const config = loadEntitlementConfig();
  const repository = createW1Repository(createW1Database(config.databaseUrl));
  return { repository, close: () => repository.close() };
}

export const createProductionW1ScopeFactory = (): W1RequestScopeFactory => ({ create: createProductionScope });
