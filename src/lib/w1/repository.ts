import { sql } from "drizzle-orm";
import type { W1DatabasePort } from "./db";
import { INTERNAL_REDEEM_PRINCIPAL, type EntitlementStatus, type IdempotentRoute, type StripeFailureCode } from "./constants";
import { completionStatus, decodeIdempotencyRecord, epochDate, validateResponseMetadata, type IdempotencyRecord, type IdempotencyReservation, type MetadataForRoute } from "./idempotency";

export interface EntitlementViewRow { id: string; clerkSubject: string; product: "agentkip_first_friend"; status: Exclude<EntitlementStatus, "inactive">; source: "stripe_subscription"; grantedAt: Date | null; revokedAt: Date | null; updatedAt: Date; stripeCustomerId: string; stripeCheckoutSessionId: string | null; stripeSubscriptionId: string; lastEventCreatedAt: Date; lastEventPrecedence: number; lastStripeEventId: string; }
export interface CheckoutIntentRow { id: string; requestIdempotencyId: string; clerkSubject: string; product: "agentkip_first_friend"; configuredPriceId: string; configuredStripeProductId: string; stripeCustomerId: string | null; stripeCheckoutSessionId: string | null; stripeSubscriptionId: string | null; }
export interface BillingCustomerRow { clerkSubject: string; stripeCustomerId: string; }
export interface ClaimRow { id: string; entitlementId: string; clerkSubject: string; product: "agentkip_first_friend"; claimHash: string; pepperVersion: number; status: "active" | "consumed" | "expired" | "revoked"; expiresAt: Date; redemptionId: string | null; consumedAt: Date | null; revokedAt: Date | null; revokeReason: string | null; }
export interface ClaimRedemptionMetadata { redemption_id: string; subject: string; entitlement: string; product: "tester"; }
export interface ClaimRedemptionOperationRow { id: string; principal: typeof INTERNAL_REDEEM_PRINCIPAL; idempotencyKey: string; requestDigest: string; responseStatus: 200; responseMetadata: ClaimRedemptionMetadata; /** Retention coordinate only; replay remains valid until a coordinated deletion policy removes the row. */ expiresAt: Date; createdAt: Date; updatedAt: Date; }
export type NewClaimRedemptionOperation = Omit<ClaimRedemptionOperationRow, "id" | "createdAt" | "updatedAt">;
export interface StripeEventRow { stripeEventId: string; eventType: string; eventCreatedAt: Date; status: "received" | "processing" | "processed" | "ignored" | "retryable_failed" | "terminal_failed"; attemptCount: number; failureCode: StripeFailureCode | null; }
export interface WebhookEventRow extends StripeEventRow { processedAt: Date | null; nextRetryAt: Date | null; }
export interface WebhookEntitlementInput { clerkSubject: string; customerId: string; sessionId: string; subscriptionId: string; status: Exclude<EntitlementStatus, "inactive">; eventId: string; eventCreatedAt: Date; eventPrecedence: number; reasonCode: "checkout_completed" | "subscription_created" | "subscription_updated" | "subscription_deleted" | "invoice_paid" | "invoice_payment_failed"; }
export interface W1ClaimRedemptionRepositoryTx {
  readClaim(id: string): Promise<ClaimRow | null>;
  readClaimRedemptionOperation(principal: typeof INTERNAL_REDEEM_PRINCIPAL, key: string): Promise<ClaimRedemptionOperationRow | null>;
  insertClaimRedemptionOperation(input: NewClaimRedemptionOperation): Promise<void>;
}
export const claimRedemptionRepositoryTx = (tx: W1RepositoryTx): W1ClaimRedemptionRepositoryTx | null => {
  const value = tx as W1RepositoryTx & Partial<W1ClaimRedemptionRepositoryTx>;
  return typeof value.readClaim === "function" && typeof value.readClaimRedemptionOperation === "function" && typeof value.insertClaimRedemptionOperation === "function" ? value as W1ClaimRedemptionRepositoryTx : null;
};
/** Deliberately separate from W1RepositoryTx so frozen claim fixtures stay narrow. */
export interface W1WebhookRepositoryTx {
  readWebhookEvent(id: string): Promise<WebhookEventRow | null>;
  lockStripeEvent(id: string): Promise<WebhookEventRow | null>;
  updateWebhookEvent(input: WebhookEventRow): Promise<WebhookEventRow>;
  lockIntentByStripeReferences(sessionId: string, subscriptionId: string): Promise<CheckoutIntentRow | null>;
  applyWebhookEntitlement(input: WebhookEntitlementInput): Promise<{ entitlement: EntitlementViewRow; applied: boolean }>;
}
export const webhookRepositoryTx = (tx: W1RepositoryTx): W1WebhookRepositoryTx | null => {
  const value = tx as W1RepositoryTx & Partial<W1WebhookRepositoryTx>;
  return typeof value.readWebhookEvent === "function" && typeof value.lockStripeEvent === "function" && typeof value.updateWebhookEvent === "function" && typeof value.lockIntentByStripeReferences === "function" && typeof value.applyWebhookEntitlement === "function" ? value as W1WebhookRepositoryTx : null;
};
export interface W1RepositoryTx {
  readIdempotency<R extends IdempotentRoute>(route: R, principal: string, key: string): Promise<IdempotencyRecord<R> | null>;
  reserveIdempotency<R extends IdempotentRoute>(input: IdempotencyReservation<R>): Promise<IdempotencyRecord<R> | null>;
  reacquireIdempotency(id: string, lockedUntil: Date, now: Date): Promise<boolean>;
  completeIdempotency<R extends IdempotentRoute>(id: string, route: R, status: number, metadata: MetadataForRoute<R>): Promise<void>;
  deleteExpiredProcessingIdempotency(now: Date): Promise<void>;
  lockEntitlement(subject: string): Promise<EntitlementViewRow | null>;
  readEntitlement(subject: string): Promise<EntitlementViewRow | null>;
  readCustomer(subject: string): Promise<BillingCustomerRow | null>;
  insertCustomer(subject: string, customerId: string): Promise<BillingCustomerRow>;
  readIntentByIdempotency(idempotencyId: string): Promise<CheckoutIntentRow | null>;
  insertIntent(input: Omit<CheckoutIntentRow, "id" | "stripeCustomerId" | "stripeCheckoutSessionId" | "stripeSubscriptionId">): Promise<CheckoutIntentRow>;
  setIntentCustomer(id: string, customerId: string): Promise<CheckoutIntentRow>;
  setIntentCheckout(id: string, sessionId: string, subscriptionId: string): Promise<CheckoutIntentRow>;
  lockClaim(id: string): Promise<ClaimRow | null>;
  lockCurrentClaim(subject: string, entitlementId: string): Promise<ClaimRow | null>;
  insertClaim(row: ClaimRow): Promise<void>;
  updateClaim(row: ClaimRow): Promise<void>;
  consumeClaim(id: string, notExpiredAfter: Date): Promise<string | null>;
  acquireAdvisoryLock(key: string): Promise<void>;
  countRecentAttempts(hash: string): Promise<number>;
  insertAttempt(hash: string, action: "issue" | "reissue"): Promise<void>;
  countRecentClaims(subject: string, entitlementId: string): Promise<number>;
  countRecentRevokes(subject: string): Promise<number>;
  insertEvent(event: StripeEventRow): Promise<StripeEventRow | null>;
  updateEvent(event: StripeEventRow): Promise<void>;
  revokeActiveClaims(entitlementId: string): Promise<void>;
}
export interface W1Repository { transaction<T>(work: (tx: W1RepositoryTx) => Promise<T>): Promise<T>; cleanupExpiredProcessingIdempotency(now: Date): Promise<void>; readEntitlement(subject: string): Promise<EntitlementViewRow | null>; close(): Promise<void>; }
const isObjectRow = <TRow extends object>(value: unknown): value is TRow => value !== null && typeof value === "object" && !Array.isArray(value);
const one = async <TRow extends object>(value: PromiseLike<{ rows: Record<string, unknown>[] }>): Promise<TRow | null> => {
  const row = (await value).rows[0];
  return isObjectRow<TRow>(row) ? row : null;
};
const exactRow = (value: unknown, keys: readonly string[], label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype || Reflect.ownKeys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) throw new TypeError(label);
  for (const key of keys) { const descriptor = Object.getOwnPropertyDescriptor(value, key); if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) throw new TypeError(label); }
  return value as Record<string, unknown>;
};
const identifier = (value: unknown, prefix: string, label: string) => { if (typeof value !== "string" || !new RegExp(`^${prefix}[A-Za-z0-9]+$`).test(value)) throw new TypeError(label); return value; };
const uuid = (value: unknown, label: string) => { if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) throw new TypeError(label); return value; };
const subject = (value: unknown, label: string) => { if (typeof value !== "string" || value.length === 0) throw new TypeError(label); return value; };
export const validateClaimRedemptionMetadata = (raw: unknown): ClaimRedemptionMetadata => {
  const label = "invalid claim redemption metadata";
  const row = exactRow(raw, ["redemption_id", "subject", "entitlement", "product"], label);
  if (typeof row.subject !== "string" || !/^[A-Za-z0-9_-]{1,255}$/.test(row.subject) || row.product !== "tester") throw new TypeError(label);
  return { redemption_id: uuid(row.redemption_id, label), subject: row.subject, entitlement: uuid(row.entitlement, label), product: "tester" };
};
const decodeClaimRedemptionOperation = (raw: unknown, expected: { principal: typeof INTERNAL_REDEEM_PRINCIPAL; idempotencyKey: string }): ClaimRedemptionOperationRow => {
  const label = "invalid claim redemption operation row";
  const row = exactRow(raw, ["id", "principal", "idempotencyKey", "requestDigest", "responseStatus", "responseMetadata", "expiresAt", "createdAt", "updatedAt"], label);
  const key = row.idempotencyKey;
  const digest = row.requestDigest;
  const expiresAt = epochDate(row.expiresAt); const createdAt = epochDate(row.createdAt); const updatedAt = epochDate(row.updatedAt);
  const id = uuid(row.id, label);
  if (row.principal !== expected.principal || key !== expected.idempotencyKey || typeof key !== "string" || !/^[A-Za-z0-9._:-]{8,128}$/.test(key) || typeof digest !== "string" || !/^[0-9a-f]{64}$/.test(digest) || row.responseStatus !== 200 || !expiresAt || !createdAt || !updatedAt || expiresAt.getTime() <= createdAt.getTime() || updatedAt.getTime() < createdAt.getTime()) throw new TypeError(label);
  return { id, principal: INTERNAL_REDEEM_PRINCIPAL, idempotencyKey: key, requestDigest: digest, responseStatus: 200, responseMetadata: validateClaimRedemptionMetadata(row.responseMetadata), expiresAt, createdAt, updatedAt };
};
const decodeCustomer = (raw: unknown, expectedSubject: string): BillingCustomerRow => { const label = "invalid billing customer row"; const row = exactRow(raw, ["clerkSubject", "stripeCustomerId"], label); if (subject(row.clerkSubject, label) !== expectedSubject || expectedSubject.length === 0) throw new TypeError(label); return { clerkSubject: expectedSubject, stripeCustomerId: identifier(row.stripeCustomerId, "cus_", label) }; };
const decodeIntent = (raw: unknown, expected?: { requestIdempotencyId: string; clerkSubject: string; configuredPriceId: string; configuredStripeProductId: string }): CheckoutIntentRow => {
  const label = "invalid checkout intent row"; const row = exactRow(raw, ["id", "requestIdempotencyId", "clerkSubject", "product", "configuredPriceId", "configuredStripeProductId", "stripeCustomerId", "stripeCheckoutSessionId", "stripeSubscriptionId"], label);
  const id = uuid(row.id, label); const requestIdempotencyId = uuid(row.requestIdempotencyId, label); const clerkSubject = subject(row.clerkSubject, label); const configuredPriceId = identifier(row.configuredPriceId, "price_", label); const configuredStripeProductId = identifier(row.configuredStripeProductId, "prod_", label);
  if (row.product !== "agentkip_first_friend") throw new TypeError(label);
  const stripeCustomerId = row.stripeCustomerId === null ? null : identifier(row.stripeCustomerId, "cus_", label);
  const stripeCheckoutSessionId = row.stripeCheckoutSessionId === null ? null : identifier(row.stripeCheckoutSessionId, "cs_test_", label);
  const stripeSubscriptionId = row.stripeSubscriptionId === null ? null : identifier(row.stripeSubscriptionId, "sub_", label);
  if ((stripeCustomerId === null && (stripeCheckoutSessionId !== null || stripeSubscriptionId !== null)) || (stripeCustomerId !== null && ((stripeCheckoutSessionId === null) !== (stripeSubscriptionId === null)))) throw new TypeError(label);
  if (expected && (requestIdempotencyId !== expected.requestIdempotencyId || clerkSubject !== expected.clerkSubject || configuredPriceId !== expected.configuredPriceId || configuredStripeProductId !== expected.configuredStripeProductId)) throw new TypeError(label);
  return { id, requestIdempotencyId, clerkSubject, product: "agentkip_first_friend", configuredPriceId, configuredStripeProductId, stripeCustomerId, stripeCheckoutSessionId, stripeSubscriptionId };
};
const decodeEntitlement = (raw: unknown, expectedSubject: string): EntitlementViewRow => {
  const label = "invalid entitlement row"; const row = exactRow(raw, ["id", "clerkSubject", "product", "status", "source", "grantedAt", "revokedAt", "updatedAt", "stripeCustomerId", "stripeCheckoutSessionId", "stripeSubscriptionId", "lastEventCreatedAt", "lastEventPrecedence", "lastStripeEventId"], label);
  const id = uuid(row.id, label); if (subject(row.clerkSubject, label) !== expectedSubject || row.product !== "agentkip_first_friend" || row.source !== "stripe_subscription") throw new TypeError(label);
  const status = row.status; if (status !== "pending" && status !== "active" && status !== "past_due" && status !== "revoked") throw new TypeError(label);
  const requireEpochDate = (value: unknown) => { const date = epochDate(value); if (!date) throw new TypeError(label); return date; };
  const grantedAt = row.grantedAt === null ? null : requireEpochDate(row.grantedAt); const revokedAt = row.revokedAt === null ? null : requireEpochDate(row.revokedAt);
  if ((status === "active" && (grantedAt === null || revokedAt !== null)) || (status === "revoked" && revokedAt === null) || ((status === "pending" || status === "past_due") && revokedAt !== null)) throw new TypeError(label);
  const stripeCustomerId = identifier(row.stripeCustomerId, "cus_", label); const stripeCheckoutSessionId = row.stripeCheckoutSessionId === null ? null : identifier(row.stripeCheckoutSessionId, "cs_test_", label); const stripeSubscriptionId = identifier(row.stripeSubscriptionId, "sub_", label); if (typeof row.lastStripeEventId !== "string" || !/^evt_[A-Za-z0-9_]+$/.test(row.lastStripeEventId)) throw new TypeError(label); const lastStripeEventId = row.lastStripeEventId;
  const lastEventPrecedence = row.lastEventPrecedence; if (typeof lastEventPrecedence !== "number" || !Number.isInteger(lastEventPrecedence) || ![10, 50, 60, 80, 90, 100].includes(lastEventPrecedence)) throw new TypeError(label);
  return { id, clerkSubject: expectedSubject, product: "agentkip_first_friend", status, source: "stripe_subscription", grantedAt, revokedAt, updatedAt: requireEpochDate(row.updatedAt), stripeCustomerId, stripeCheckoutSessionId, stripeSubscriptionId, lastEventCreatedAt: requireEpochDate(row.lastEventCreatedAt), lastEventPrecedence, lastStripeEventId };
};
const decodeClaim = (raw: unknown): ClaimRow => {
  const label = "invalid bootstrap claim row"; const row = exactRow(raw, ["id", "entitlementId", "clerkSubject", "product", "claimHash", "pepperVersion", "status", "expiresAt", "redemptionId", "consumedAt", "revokedAt", "revokeReason"], label);
  const id = uuid(row.id, label); const entitlementId = uuid(row.entitlementId, label); const clerkSubject = subject(row.clerkSubject, label);
  if (row.product !== "agentkip_first_friend" || typeof row.claimHash !== "string" || row.claimHash.length === 0 || typeof row.pepperVersion !== "number" || !Number.isInteger(row.pepperVersion)) throw new TypeError(label);
  const status = row.status; if (status !== "active" && status !== "consumed" && status !== "expired" && status !== "revoked") throw new TypeError(label);
  const expiresAt = epochDate(row.expiresAt); if (!expiresAt) throw new TypeError(label);
  if (row.redemptionId !== null && typeof row.redemptionId !== "string") throw new TypeError(label);
  const consumedAt = row.consumedAt === null ? null : epochDate(row.consumedAt); if (row.consumedAt !== null && !consumedAt) throw new TypeError(label);
  const revokedAt = row.revokedAt === null ? null : epochDate(row.revokedAt); if (row.revokedAt !== null && !revokedAt) throw new TypeError(label);
  if (row.revokeReason !== null && row.revokeReason !== "delivery_uncertain") throw new TypeError(label);
  return { id, entitlementId, clerkSubject, product: "agentkip_first_friend", claimHash: row.claimHash, pepperVersion: row.pepperVersion, status, expiresAt, redemptionId: row.redemptionId as string | null, consumedAt, revokedAt, revokeReason: row.revokeReason as "delivery_uncertain" | null };
};
const decodeWebhookEvent = (raw: unknown, expectedId: string): WebhookEventRow => {
  const label = "invalid webhook event row"; const row = exactRow(raw, ["stripeEventId", "eventType", "eventCreatedAt", "status", "attemptCount", "processedAt", "nextRetryAt", "failureCode"], label);
  const stripeEventId = identifier(row.stripeEventId, "evt_", label); const attemptCount = row.attemptCount; const eventCreatedAt = epochDate(row.eventCreatedAt); if (stripeEventId !== expectedId || typeof row.eventType !== "string" || !eventCreatedAt || typeof attemptCount !== "number" || !Number.isInteger(attemptCount) || attemptCount < 0) throw new TypeError(label);
  const status = row.status; if (status !== "received" && status !== "processing" && status !== "processed" && status !== "ignored" && status !== "retryable_failed" && status !== "terminal_failed") throw new TypeError(label);
  const processedAt = row.processedAt === null ? null : epochDate(row.processedAt); const nextRetryAt = row.nextRetryAt === null ? null : epochDate(row.nextRetryAt);
  if (row.processedAt !== null && !processedAt) throw new TypeError(label); if (row.nextRetryAt !== null && !nextRetryAt) throw new TypeError(label);
  const failureCode = row.failureCode; if (failureCode !== null && failureCode !== "database_retryable" && failureCode !== "lock_retryable" && failureCode !== "stripe_read_retryable" && failureCode !== "wrong_mode" && failureCode !== "malformed_supported_object" && failureCode !== "price_mismatch" && failureCode !== "product_mismatch" && failureCode !== "unknown_intent" && failureCode !== "unknown_customer" && failureCode !== "identifier_mismatch" && failureCode !== "metadata_mismatch") throw new TypeError(label);
  return { stripeEventId, eventType: row.eventType, eventCreatedAt, status, attemptCount, processedAt, nextRetryAt, failureCode };
};
export function createW1Repository(database: W1DatabasePort): W1Repository {
  const transaction = <T>(work: (tx: W1RepositoryTx) => Promise<T>) => database.transaction(async (tx) => {
    const query = async <TRow extends object>(statement: ReturnType<typeof sql>) => one<TRow>(tx.execute(statement));
    const claimColumns = sql`id, entitlement_id as "entitlementId", clerk_subject as "clerkSubject", product, claim_hash as "claimHash", pepper_version as "pepperVersion", status, (extract(epoch from expires_at) * 1000)::double precision as "expiresAt", redemption_id as "redemptionId", (extract(epoch from consumed_at) * 1000)::double precision as "consumedAt", (extract(epoch from revoked_at) * 1000)::double precision as "revokedAt", revoke_reason as "revokeReason"`;
    const adapter: W1RepositoryTx = {
      readIdempotency: async <R extends IdempotentRoute>(route: R, principal: string, key: string) => {
        const record = await query<Record<string, unknown>>(sql`select id, route, principal, idempotency_key as "idempotencyKey", request_digest as "requestDigest", status, response_status as "responseStatus", response_metadata as "responseMetadata", (extract(epoch from locked_until) * 1000)::double precision as "lockedUntil", (extract(epoch from expires_at) * 1000)::double precision as "expiresAt" from request_idempotency where route=${route} and principal=${principal} and idempotency_key=${key} for update`);
        return record ? decodeIdempotencyRecord(record, { route, principal, idempotencyKey: key }) : null;
      },
      reserveIdempotency: async <R extends IdempotentRoute>(input: IdempotencyReservation<R>) => {
        const record = await query<Record<string, unknown>>(sql`insert into request_idempotency (route, principal, idempotency_key, request_digest, locked_until, expires_at, updated_at) values (${input.route}, ${input.principal}, ${input.idempotencyKey}, ${input.requestDigest}, ${input.lockedUntil}, ${input.expiresAt}, now()) on conflict (route, principal, idempotency_key) do nothing returning id, route, principal, idempotency_key as "idempotencyKey", request_digest as "requestDigest", status, response_status as "responseStatus", response_metadata as "responseMetadata", (extract(epoch from locked_until) * 1000)::double precision as "lockedUntil", (extract(epoch from expires_at) * 1000)::double precision as "expiresAt"`);
        return record ? decodeIdempotencyRecord(record, input) : null;
      },
      reacquireIdempotency: async (id, lockedUntil, now) => Boolean(await query<{ id: string }>(sql`update request_idempotency set locked_until=${lockedUntil}, updated_at=now() where id=${id} and status='processing' and locked_until <= ${now} returning id`)),
      completeIdempotency: async <R extends IdempotentRoute>(id: string, route: R, status: number, metadata: MetadataForRoute<R>) => {
        if (status !== completionStatus(route)) throw new TypeError("invalid idempotency completion status");
        const checked = validateResponseMetadata(route, metadata);
        const completed = await query<{ id: string }>(sql`update request_idempotency set status='completed', response_status=${status}, response_metadata=${JSON.stringify(checked)}::jsonb, locked_until=null, updated_at=now() where id=${id} and status='processing' returning id`);
        if (!completed) throw new Error("idempotency completion did not update exactly one processing row");
      },
      deleteExpiredProcessingIdempotency: async (now) => { await tx.execute(sql`delete from request_idempotency where status='processing' and expires_at <= ${now}`); },
      lockEntitlement: async (subject) => { const row = await query<Record<string, unknown>>(sql`select id, clerk_subject as "clerkSubject", product, status, source, (extract(epoch from granted_at) * 1000)::double precision as "grantedAt", (extract(epoch from revoked_at) * 1000)::double precision as "revokedAt", (extract(epoch from updated_at) * 1000)::double precision as "updatedAt", stripe_customer_id as "stripeCustomerId", stripe_checkout_session_id as "stripeCheckoutSessionId", stripe_subscription_id as "stripeSubscriptionId", (extract(epoch from last_event_created_at) * 1000)::double precision as "lastEventCreatedAt", last_event_precedence as "lastEventPrecedence", last_stripe_event_id as "lastStripeEventId" from entitlements where clerk_subject=${subject} and product='agentkip_first_friend' for update`); return row ? decodeEntitlement(row, subject) : null; },
      readEntitlement: async (subject) => { const row = await query<Record<string, unknown>>(sql`select id, clerk_subject as "clerkSubject", product, status, source, (extract(epoch from granted_at) * 1000)::double precision as "grantedAt", (extract(epoch from revoked_at) * 1000)::double precision as "revokedAt", (extract(epoch from updated_at) * 1000)::double precision as "updatedAt", stripe_customer_id as "stripeCustomerId", stripe_checkout_session_id as "stripeCheckoutSessionId", stripe_subscription_id as "stripeSubscriptionId", (extract(epoch from last_event_created_at) * 1000)::double precision as "lastEventCreatedAt", last_event_precedence as "lastEventPrecedence", last_stripe_event_id as "lastStripeEventId" from entitlements where clerk_subject=${subject} and product='agentkip_first_friend'`); return row ? decodeEntitlement(row, subject) : null; },
      readCustomer: async (subject) => { const row = await query<Record<string, unknown>>(sql`select clerk_subject as "clerkSubject", stripe_customer_id as "stripeCustomerId" from billing_customers where clerk_subject=${subject} for update`); return row ? decodeCustomer(row, subject) : null; },
      insertCustomer: async (subject, customerId) => {
        const row = await query<BillingCustomerRow>(sql`insert into billing_customers (clerk_subject, stripe_customer_id, updated_at) values (${subject}, ${customerId}, now()) returning clerk_subject as "clerkSubject", stripe_customer_id as "stripeCustomerId"`);
        if (!row) throw new Error("billing customer insert did not return a row");
        return decodeCustomer(row, subject);
      },
      readIntentByIdempotency: async (id) => { const row = await query<Record<string, unknown>>(sql`select id, request_idempotency_id as "requestIdempotencyId", clerk_subject as "clerkSubject", product, configured_price_id as "configuredPriceId", configured_stripe_product_id as "configuredStripeProductId", stripe_customer_id as "stripeCustomerId", stripe_checkout_session_id as "stripeCheckoutSessionId", stripe_subscription_id as "stripeSubscriptionId" from billing_checkout_intents where request_idempotency_id=${id} for update`); return row ? decodeIntent(row) : null; },
      insertIntent: async (input) => {
        const row = await query<CheckoutIntentRow>(sql`insert into billing_checkout_intents (request_idempotency_id, clerk_subject, product, configured_price_id, configured_stripe_product_id, updated_at) values (${input.requestIdempotencyId}, ${input.clerkSubject}, ${input.product}, ${input.configuredPriceId}, ${input.configuredStripeProductId}, now()) returning id, request_idempotency_id as "requestIdempotencyId", clerk_subject as "clerkSubject", product, configured_price_id as "configuredPriceId", configured_stripe_product_id as "configuredStripeProductId", stripe_customer_id as "stripeCustomerId", stripe_checkout_session_id as "stripeCheckoutSessionId", stripe_subscription_id as "stripeSubscriptionId"`);
        if (!row) throw new Error("checkout intent insert did not return a row");
        return decodeIntent(row, input);
      },
      setIntentCustomer: async (id, customer) => {
        const row = await query<CheckoutIntentRow>(sql`update billing_checkout_intents set stripe_customer_id=case when stripe_customer_id is null then ${customer} else stripe_customer_id end, updated_at=now() where id=${id} and (stripe_customer_id is null or stripe_customer_id=${customer}) returning id, request_idempotency_id as "requestIdempotencyId", clerk_subject as "clerkSubject", product, configured_price_id as "configuredPriceId", configured_stripe_product_id as "configuredStripeProductId", stripe_customer_id as "stripeCustomerId", stripe_checkout_session_id as "stripeCheckoutSessionId", stripe_subscription_id as "stripeSubscriptionId"`);
        if (!row) throw new Error("checkout intent customer disagreement");
        const decoded = decodeIntent(row); if (decoded.stripeCustomerId !== customer) throw new Error("checkout intent customer disagreement"); return decoded;
      },
      setIntentCheckout: async (id, session, subscription) => {
        const row = await query<CheckoutIntentRow>(sql`update billing_checkout_intents set stripe_checkout_session_id=case when stripe_checkout_session_id is null then ${session} else stripe_checkout_session_id end, stripe_subscription_id=case when stripe_subscription_id is null then ${subscription} else stripe_subscription_id end, updated_at=now() where id=${id} and (stripe_checkout_session_id is null or stripe_checkout_session_id=${session}) and (stripe_subscription_id is null or stripe_subscription_id=${subscription}) returning id, request_idempotency_id as "requestIdempotencyId", clerk_subject as "clerkSubject", product, configured_price_id as "configuredPriceId", configured_stripe_product_id as "configuredStripeProductId", stripe_customer_id as "stripeCustomerId", stripe_checkout_session_id as "stripeCheckoutSessionId", stripe_subscription_id as "stripeSubscriptionId"`);
        if (!row) throw new Error("checkout intent provider disagreement");
        const decoded = decodeIntent(row); if (decoded.stripeCheckoutSessionId !== session || decoded.stripeSubscriptionId !== subscription) throw new Error("checkout intent provider disagreement"); return decoded;
      },
      lockClaim: async (id) => { const row = await query<Record<string, unknown>>(sql`select ${claimColumns} from bootstrap_claims where id=${id} for update`); return row ? decodeClaim(row) : null; }, lockCurrentClaim: async (subject, entitlement) => { const row = await query<Record<string, unknown>>(sql`select ${claimColumns} from bootstrap_claims where clerk_subject=${subject} and entitlement_id=${entitlement} and status='active' for update`); return row ? decodeClaim(row) : null; },
      insertClaim: async (row) => { await tx.execute(sql`insert into bootstrap_claims (id, entitlement_id, clerk_subject, product, claim_hash, pepper_version, status, expires_at, updated_at) values (${row.id}, ${row.entitlementId}, ${row.clerkSubject}, ${row.product}, ${row.claimHash}, ${row.pepperVersion}, ${row.status}, ${row.expiresAt}, now())`); }, updateClaim: async (row) => { await tx.execute(sql`update bootstrap_claims set status=${row.status}, consumed_at=${row.consumedAt}, redemption_id=${row.redemptionId}, revoked_at=${row.revokedAt}, revoke_reason=${row.revokeReason}, updated_at=now() where id=${row.id}`); }, consumeClaim: async (id, notExpiredAfter) => { const row = await query<Record<string, unknown>>(sql`update bootstrap_claims set status='consumed', consumed_at=now(), redemption_id=gen_random_uuid(), updated_at=now() where id=${id} and status='active' and expires_at > ${notExpiredAfter} returning redemption_id as "redemptionId"`); if (!row) return null; return uuid(exactRow(row, ["redemptionId"], "invalid redemption row").redemptionId, "invalid redemption row"); },
      acquireAdvisoryLock: async (key) => { await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`); }, countRecentAttempts: async (hash) => Number((await query<{ count: number }>(sql`select count(*)::int as count from bootstrap_claim_attempts where source_ip_hash=${hash} and created_at >= now() - interval '15 minutes'`))?.count ?? 0), insertAttempt: async (hash, action) => { await tx.execute(sql`insert into bootstrap_claim_attempts (source_ip_hash, action) values (${hash}, ${action})`); }, countRecentClaims: async (subject, entitlement) => Number((await query<{ count: number }>(sql`select count(*)::int as count from bootstrap_claims where clerk_subject=${subject} and entitlement_id=${entitlement} and created_at >= now() - interval '15 minutes'`))?.count ?? 0), countRecentRevokes: async (subject) => Number((await query<{ count: number }>(sql`select count(*)::int as count from request_idempotency where principal=${subject} and route='/api/bootstrap-claims/[claim_id]/revoke' and created_at >= now() - interval '15 minutes'`))?.count ?? 0),
      insertEvent: (event) => query<StripeEventRow>(sql`insert into stripe_events (stripe_event_id, event_type, event_created_at, status, attempt_count, failure_code, updated_at) values (${event.stripeEventId}, ${event.eventType}, ${event.eventCreatedAt}, ${event.status}, ${event.attemptCount}, ${event.failureCode}, now()) on conflict (stripe_event_id) do nothing returning stripe_event_id as "stripeEventId", event_type as "eventType", event_created_at as "eventCreatedAt", status, attempt_count as "attemptCount", failure_code as "failureCode"`), updateEvent: async (event) => { await tx.execute(sql`update stripe_events set status=${event.status}, attempt_count=${event.attemptCount}, failure_code=${event.failureCode}, updated_at=now() where stripe_event_id=${event.stripeEventId}`); }, revokeActiveClaims: async (entitlement) => { await tx.execute(sql`update bootstrap_claims set status='revoked', revoked_at=now(), revoke_reason='entitlement_inactive', updated_at=now() where entitlement_id=${entitlement} and status='active'`); },
    };
    const redemptionAdapter: W1ClaimRedemptionRepositoryTx = {
      readClaim: async (id) => { const row = await query<Record<string, unknown>>(sql`select ${claimColumns} from bootstrap_claims where id=${id}`); return row ? decodeClaim(row) : null; },
      readClaimRedemptionOperation: async (principal, key) => {
        const row = await query<Record<string, unknown>>(sql`select id, principal, idempotency_key as "idempotencyKey", request_digest as "requestDigest", response_status as "responseStatus", response_metadata as "responseMetadata", (extract(epoch from expires_at) * 1000)::double precision as "expiresAt", (extract(epoch from created_at) * 1000)::double precision as "createdAt", (extract(epoch from updated_at) * 1000)::double precision as "updatedAt" from bootstrap_claim_redemptions where principal=${principal} and idempotency_key=${key}`);
        return row ? decodeClaimRedemptionOperation(row, { principal, idempotencyKey: key }) : null;
      },
      insertClaimRedemptionOperation: async (input) => {
        const key = input.idempotencyKey; const digest = input.requestDigest; const expiresAt = input.expiresAt;
        if (input.principal !== INTERNAL_REDEEM_PRINCIPAL || typeof key !== "string" || !/^[A-Za-z0-9._:-]{8,128}$/.test(key) || typeof digest !== "string" || !/^[0-9a-f]{64}$/.test(digest) || input.responseStatus !== 200 || !(expiresAt instanceof Date) || !Number.isFinite(expiresAt.getTime())) throw new TypeError("invalid claim redemption operation");
        const metadata = validateClaimRedemptionMetadata(input.responseMetadata);
        const row = await query<{ id: string; principal: string; idempotencyKey: string }>(sql`insert into bootstrap_claim_redemptions (principal, idempotency_key, request_digest, response_status, response_metadata, expires_at, updated_at) values (${input.principal}, ${key}, ${digest}, ${input.responseStatus}, ${JSON.stringify(metadata)}::jsonb, ${expiresAt}, now()) returning id, principal, idempotency_key as "idempotencyKey"`);
        if (!row || uuid(row.id, "invalid claim redemption row") !== row.id || row.principal !== INTERNAL_REDEEM_PRINCIPAL || row.idempotencyKey !== key) throw new Error("claim redemption operation insert did not return exactly one row");
      },
    };
    const eventColumns = sql`stripe_event_id as "stripeEventId", event_type as "eventType", (extract(epoch from event_created_at) * 1000)::double precision as "eventCreatedAt", status, attempt_count as "attemptCount", (extract(epoch from processed_at) * 1000)::double precision as "processedAt", (extract(epoch from next_retry_at) * 1000)::double precision as "nextRetryAt", failure_code as "failureCode"`;
    const webhookAdapter: W1WebhookRepositoryTx = {
      readWebhookEvent: async (id) => {
        const row = await query<Record<string, unknown>>(sql`select ${eventColumns} from stripe_events where stripe_event_id=${id}`);
        return row ? decodeWebhookEvent(row, id) : null;
      },
      lockStripeEvent: async (id) => {
        const row = await query<Record<string, unknown>>(sql`select ${eventColumns} from stripe_events where stripe_event_id=${id} for update`);
        return row ? decodeWebhookEvent(row, id) : null;
      },
      updateWebhookEvent: async (event) => {
        const row = await query<Record<string, unknown>>(sql`update stripe_events set status=${event.status}, attempt_count=${event.attemptCount}, processed_at=${event.processedAt}, next_retry_at=${event.nextRetryAt}, failure_code=${event.failureCode}, updated_at=now() where stripe_event_id=${event.stripeEventId} returning ${eventColumns}`);
        if (!row) throw new Error("webhook event update did not return a row");
        return decodeWebhookEvent(row, event.stripeEventId);
      },
      lockIntentByStripeReferences: async (sessionId, subscriptionId) => {
        const row = await query<Record<string, unknown>>(sql`select id, request_idempotency_id as "requestIdempotencyId", clerk_subject as "clerkSubject", product, configured_price_id as "configuredPriceId", configured_stripe_product_id as "configuredStripeProductId", stripe_customer_id as "stripeCustomerId", stripe_checkout_session_id as "stripeCheckoutSessionId", stripe_subscription_id as "stripeSubscriptionId" from billing_checkout_intents where stripe_checkout_session_id=${sessionId} and stripe_subscription_id=${subscriptionId} for update`);
        return row ? decodeIntent(row) : null;
      },
      applyWebhookEntitlement: async (input) => {
        const current = await adapter.lockEntitlement(input.clerkSubject);
        const tupleNewer = !current || input.eventCreatedAt.getTime() > current.lastEventCreatedAt.getTime() || (input.eventCreatedAt.getTime() === current.lastEventCreatedAt.getTime() && (input.eventPrecedence > current.lastEventPrecedence || (input.eventPrecedence === current.lastEventPrecedence && input.eventId > current.lastStripeEventId)));
        if (!tupleNewer && current) return { entitlement: current, applied: false };
        const grantedAt = input.status === "active" ? new Date(input.eventCreatedAt.getTime()) : null;
        const revokedAt = input.status === "revoked" ? new Date(input.eventCreatedAt.getTime()) : null;
        const row = current
          ? await query<Record<string, unknown>>(sql`update entitlements set status=${input.status}, stripe_customer_id=${input.customerId}, stripe_checkout_session_id=${input.sessionId}, stripe_subscription_id=${input.subscriptionId}, last_stripe_event_id=${input.eventId}, last_event_created_at=${input.eventCreatedAt}, last_event_precedence=${input.eventPrecedence}, granted_at=case when ${input.status}='active' then coalesce(granted_at, ${grantedAt}) else granted_at end, revoked_at=${revokedAt}, updated_at=now() where id=${current.id} returning id, clerk_subject as "clerkSubject", product, status, source, (extract(epoch from granted_at) * 1000)::double precision as "grantedAt", (extract(epoch from revoked_at) * 1000)::double precision as "revokedAt", (extract(epoch from updated_at) * 1000)::double precision as "updatedAt", stripe_customer_id as "stripeCustomerId", stripe_checkout_session_id as "stripeCheckoutSessionId", stripe_subscription_id as "stripeSubscriptionId", (extract(epoch from last_event_created_at) * 1000)::double precision as "lastEventCreatedAt", last_event_precedence as "lastEventPrecedence", last_stripe_event_id as "lastStripeEventId"`)
          : await query<Record<string, unknown>>(sql`insert into entitlements (clerk_subject, product, status, source, stripe_customer_id, stripe_checkout_session_id, stripe_subscription_id, last_stripe_event_id, last_event_created_at, last_event_precedence, granted_at, revoked_at, updated_at) values (${input.clerkSubject}, 'agentkip_first_friend', ${input.status}, 'stripe_subscription', ${input.customerId}, ${input.sessionId}, ${input.subscriptionId}, ${input.eventId}, ${input.eventCreatedAt}, ${input.eventPrecedence}, ${grantedAt}, ${revokedAt}, now()) returning id, clerk_subject as "clerkSubject", product, status, source, (extract(epoch from granted_at) * 1000)::double precision as "grantedAt", (extract(epoch from revoked_at) * 1000)::double precision as "revokedAt", (extract(epoch from updated_at) * 1000)::double precision as "updatedAt", stripe_customer_id as "stripeCustomerId", stripe_checkout_session_id as "stripeCheckoutSessionId", stripe_subscription_id as "stripeSubscriptionId", (extract(epoch from last_event_created_at) * 1000)::double precision as "lastEventCreatedAt", last_event_precedence as "lastEventPrecedence", last_stripe_event_id as "lastStripeEventId"`);
        if (!row) throw new Error("webhook entitlement write did not return a row");
        const entitlement = decodeEntitlement(row, input.clerkSubject);
        await tx.execute(sql`insert into entitlement_transitions (entitlement_id, stripe_event_id, from_status, to_status, event_created_at, event_precedence, reason_code) values (${entitlement.id}, ${input.eventId}, ${current?.status ?? null}, ${input.status}, ${input.eventCreatedAt}, ${input.eventPrecedence}, ${input.reasonCode})`);
        return { entitlement, applied: true };
      },
    };
    Object.assign(adapter as object, redemptionAdapter, webhookAdapter);
    return work(adapter);
  });
  return {
    transaction,
    cleanupExpiredProcessingIdempotency: (now) => transaction((tx) => tx.deleteExpiredProcessingIdempotency(now)),
    readEntitlement: (subject) => transaction((tx) => tx.readEntitlement(subject)),
    close: () => database.close(),
  };
}
