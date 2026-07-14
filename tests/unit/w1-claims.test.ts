import { describe, expect, it } from "vitest";
import { CLAIM_TTL_MS, CLAIM_UNAVAILABLE_PAD_MS, ENTITLEMENT_PRODUCT, type IdempotentRoute, type W1Clock, type W1Random } from "@/lib/w1/constants";
import { createW1Services, type ClaimIssueResponse } from "@/lib/w1/services";
import type { ClaimRow, EntitlementViewRow, W1Repository, W1RepositoryTx } from "@/lib/w1/repository";
import type { IdempotencyRecord, IdempotencyReservation, MetadataForRoute } from "@/lib/w1/idempotency";
describe("W1 claim policy", () => { it("keeps frozen claim timing", () => { expect(CLAIM_TTL_MS).toBe(900000); expect(CLAIM_UNAVAILABLE_PAD_MS).toBe(75); }); });

type StoredIdempotency = IdempotencyRecord<IdempotentRoute>;
type FixtureState = { entitlements: Map<string, EntitlementViewRow>; claims: Map<string, ClaimRow>; idempotency: Map<string, StoredIdempotency>; attempts: Array<{ hash: string; action: "issue" | "reissue" }>; nextId: number; };
const fixtureId = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const recordKey = (route: IdempotentRoute, subject: string, key: string) => `${route}\u0000${subject}\u0000${key}`;
const cloneClaim = (row: ClaimRow): ClaimRow => ({ ...row, expiresAt: new Date(row.expiresAt), consumedAt: row.consumedAt && new Date(row.consumedAt), revokedAt: row.revokedAt && new Date(row.revokedAt) });
const cloneRecord = <R extends IdempotentRoute>(record: IdempotencyRecord<R>): IdempotencyRecord<R> => ({ ...record, lockedUntil: record.lockedUntil && new Date(record.lockedUntil), expiresAt: new Date(record.expiresAt), responseMetadata: record.responseMetadata && { ...record.responseMetadata } });
const cloneState = (state: FixtureState): FixtureState => ({ entitlements: new Map([...state.entitlements].map(([key, row]) => [key, { ...row, grantedAt: row.grantedAt && new Date(row.grantedAt), revokedAt: row.revokedAt && new Date(row.revokedAt), updatedAt: new Date(row.updatedAt), lastEventCreatedAt: new Date(row.lastEventCreatedAt) }])), claims: new Map([...state.claims].map(([key, row]) => [key, cloneClaim(row)])), idempotency: new Map([...state.idempotency].map(([key, row]) => [key, cloneRecord(row)])), attempts: state.attempts.map((attempt) => ({ ...attempt })), nextId: state.nextId });

class ClaimFixture implements W1Repository {
  state: FixtureState;
  failCompletion = false;
  readonly clock: W1Clock = { now: () => new Date("2026-07-14T12:00:00.000Z") };
  readonly random: W1Random = { randomUUID: () => fixtureId(this.state.nextId++), randomBytes: (size) => Uint8Array.from({ length: size }, (_, index) => (this.state.nextId + index) % 256) };

  constructor(subject = "subject-a") {
    const now = this.clock.now();
    this.state = { entitlements: new Map([[subject, { id: "entitlement-a", clerkSubject: subject, product: ENTITLEMENT_PRODUCT, status: "active", source: "stripe_subscription", grantedAt: now, revokedAt: null, updatedAt: now, stripeCustomerId: "cus_fixture", stripeCheckoutSessionId: null, stripeSubscriptionId: "sub_fixture", lastEventCreatedAt: now, lastEventPrecedence: 50, lastStripeEventId: "evt_fixture" }]]), claims: new Map(), idempotency: new Map(), attempts: [], nextId: 1 };
  }

  async transaction<T>(work: (tx: W1RepositoryTx) => Promise<T>): Promise<T> {
    const draft = cloneState(this.state);
    const tx: W1RepositoryTx = {
      readIdempotency: async <R extends IdempotentRoute>(route: R, subject: string, key: string) => {
        const record = draft.idempotency.get(recordKey(route, subject, key));
        return record ? cloneRecord(record) as IdempotencyRecord<R> : null;
      },
      reserveIdempotency: async <R extends IdempotentRoute>(input: IdempotencyReservation<R>) => {
        const key = recordKey(input.route, input.principal, input.idempotencyKey);
        if (draft.idempotency.has(key)) return null;
        if (!input.lockedUntil) throw new Error("fixture processing lease missing");
        const record: IdempotencyRecord<R> = { id: fixtureId(draft.nextId++), route: input.route, principal: input.principal, idempotencyKey: input.idempotencyKey, requestDigest: input.requestDigest, status: "processing", responseStatus: null, responseMetadata: null, lockedUntil: new Date(input.lockedUntil), expiresAt: new Date(input.expiresAt) };
        draft.idempotency.set(key, record);
        return cloneRecord(record);
      },
      reacquireIdempotency: async (id, lockedUntil, now) => {
        const record = [...draft.idempotency.values()].find((candidate) => candidate.id === id);
        if (!record || record.status !== "processing" || !record.lockedUntil || record.lockedUntil.getTime() > now.getTime()) return false;
        record.lockedUntil = new Date(lockedUntil);
        return true;
      },
      completeIdempotency: async <R extends IdempotentRoute>(id: string, route: R, status: number, metadata: MetadataForRoute<R>) => {
        if (this.failCompletion) throw new Error("injected completion failure");
        const record = [...draft.idempotency.values()].find((candidate) => candidate.id === id && candidate.route === route);
        if (!record || record.status !== "processing") throw new Error("completion disagreement");
        record.status = "completed";
        record.responseStatus = status;
        record.responseMetadata = { ...metadata } as MetadataForRoute<IdempotentRoute>;
        record.lockedUntil = null;
      },
      deleteExpiredProcessingIdempotency: async () => undefined,
      lockEntitlement: async (subject) => { const row = draft.entitlements.get(subject); return row ? { ...row, grantedAt: row.grantedAt && new Date(row.grantedAt), revokedAt: row.revokedAt && new Date(row.revokedAt), updatedAt: new Date(row.updatedAt), lastEventCreatedAt: new Date(row.lastEventCreatedAt) } : null; },
      readEntitlement: async (subject) => { const row = draft.entitlements.get(subject); return row ? { ...row, grantedAt: row.grantedAt && new Date(row.grantedAt), revokedAt: row.revokedAt && new Date(row.revokedAt), updatedAt: new Date(row.updatedAt), lastEventCreatedAt: new Date(row.lastEventCreatedAt) } : null; },
      readCustomer: async () => null,
      insertCustomer: async () => { throw new Error("not used by claim fixture"); },
      readIntentByIdempotency: async () => null,
      insertIntent: async () => { throw new Error("not used by claim fixture"); },
      setIntentCustomer: async () => { throw new Error("not used by claim fixture"); },
      setIntentCheckout: async () => { throw new Error("not used by claim fixture"); },
      lockClaim: async (id) => { const row = draft.claims.get(id); return row ? cloneClaim(row) : null; },
      lockCurrentClaim: async (subject, entitlementId) => { const row = [...draft.claims.values()].find((candidate) => candidate.clerkSubject === subject && candidate.entitlementId === entitlementId && candidate.status === "active"); return row ? cloneClaim(row) : null; },
      insertClaim: async (row) => { draft.claims.set(row.id, cloneClaim(row)); },
      updateClaim: async (row) => { draft.claims.set(row.id, cloneClaim(row)); },
      consumeClaim: async (id) => { const row = draft.claims.get(id); if (!row || row.status !== "active") return null; const redemptionId = fixtureId(draft.nextId++); draft.claims.set(id, { ...row, status: "consumed", consumedAt: this.clock.now(), redemptionId }); return redemptionId; },
      acquireAdvisoryLock: async () => undefined,
      countRecentAttempts: async (hash) => draft.attempts.filter((attempt) => attempt.hash === hash).length,
      insertAttempt: async (hash, action) => { draft.attempts.push({ hash, action }); },
      countRecentClaims: async (subject, entitlementId) => [...draft.claims.values()].filter((claim) => claim.clerkSubject === subject && claim.entitlementId === entitlementId).length,
      countRecentRevokes: async () => 0,
      insertEvent: async () => null,
      updateEvent: async () => undefined,
      revokeActiveClaims: async () => undefined,
    };
    const result = await work(tx);
    this.state = draft;
    return result;
  }

  async cleanupExpiredProcessingIdempotency(): Promise<void> {}
  async readEntitlement(subject: string): Promise<EntitlementViewRow | null> { const row = this.state.entitlements.get(subject); return row ? { ...row, grantedAt: row.grantedAt && new Date(row.grantedAt), revokedAt: row.revokedAt && new Date(row.revokedAt), updatedAt: new Date(row.updatedAt), lastEventCreatedAt: new Date(row.lastEventCreatedAt) } : null; }
  async close(): Promise<void> {}
  services() { return createW1Services({ repository: this, claimPepper: "fixture-claim-pepper", rateLimitPepper: "fixture-rate-pepper", clock: this.clock, random: this.random }); }
  snapshot() { return JSON.stringify({ claims: [...this.state.claims.values()].map(cloneClaim), idempotency: [...this.state.idempotency.values()].map(cloneRecord), attempts: this.state.attempts }); }
  addProcessing(route: "/api/bootstrap-claims/[claim_id]/reissue", subject: string, key: string, digest: string, lockedUntil: Date) { const record: IdempotencyRecord<typeof route> = { id: fixtureId(this.state.nextId++), route, principal: subject, idempotencyKey: key, requestDigest: digest, status: "processing", responseStatus: null, responseMetadata: null, lockedUntil, expiresAt: new Date(this.clock.now().getTime() + 86_400_000) }; this.state.idempotency.set(recordKey(route, subject, key), record); return record.id; }
}

const key = "c4-key-0001";
const digest = (value: string) => value.repeat(64).slice(0, 64);
const sourceIpHash = "source-ip-hash";
const responseKeys = ["claim", "claim_id", "expires_at", "replayable"];
const expectExactResponse = (response: ClaimIssueResponse) => { expect(Object.keys(response).sort()).toEqual(responseKeys); expect(response.claim).toMatch(/^akc1\./); expect(response.replayable).toBe(false); };

describe("W1 C4 bounded claim atomicity and recovery", () => {
  it("commits source replacement attempt and route-bound completion together without persisted plaintext", async () => {
    const fixture = new ClaimFixture();
    const services = fixture.services();
    const issued = await services.issueClaim("subject-a", key, digest("a"), sourceIpHash);
    expectExactResponse(issued);
    const beforeFailure = fixture.snapshot();
    fixture.failCompletion = true;
    await expect(services.reissueClaim("subject-a", issued.claim_id, "c4-key-0002", digest("b"), sourceIpHash)).rejects.toMatchObject({ code: "claim_service_unavailable" });
    fixture.failCompletion = false;
    expect(fixture.snapshot()).toBe(beforeFailure);

    const reissued = await services.reissueClaim("subject-a", issued.claim_id, "c4-key-0002", digest("b"), sourceIpHash);
    expectExactResponse(reissued);
    const records = [...fixture.state.idempotency.values()];
    const reissueRecords = records.filter((record) => record.route === "/api/bootstrap-claims/[claim_id]/reissue");
    expect(reissueRecords).toHaveLength(1);
    expect(reissueRecords[0]).toMatchObject({ principal: "subject-a", idempotencyKey: "c4-key-0002", requestDigest: digest("b"), status: "completed", responseStatus: 201 });
    expect(records.some((record) => record.idempotencyKey.includes(".recover") || record.requestDigest.includes(".recover") || record.route === "/api/bootstrap-claims/[claim_id]/revoke")).toBe(false);
    expect(fixture.state.claims.get(issued.claim_id)?.status).toBe("revoked");
    expect(fixture.state.claims.get(reissued.claim_id)?.claimHash).not.toBe(reissued.claim);
    expect(fixture.state.attempts).toEqual([{ hash: sourceIpHash, action: "issue" }, { hash: sourceIpHash, action: "reissue" }]);
    expect(fixture.snapshot()).not.toContain(issued.claim);
    expect(fixture.snapshot()).not.toContain(reissued.claim);

    const afterFirstCompletion = fixture.snapshot();
    await expect(services.reissueClaim("subject-a", issued.claim_id, "c4-key-0002", digest("b"), sourceIpHash)).rejects.toMatchObject({ code: "claim_secret_not_replayable" });
    expect(fixture.snapshot()).toBe(afterFirstCompletion);
    await expect(services.reissueClaim("subject-a", issued.claim_id, "c4-key-0002", digest("c"), sourceIpHash)).rejects.toMatchObject({ code: "idempotency_conflict" });
    expect(fixture.snapshot()).toBe(afterFirstCompletion);
  });

  it("stops live leases and reacquires stale leases on the same route-bound row", async () => {
    const fixture = new ClaimFixture();
    const services = fixture.services();
    const issued = await services.issueClaim("subject-a", key, digest("a"), sourceIpHash);
    const recordId = fixture.addProcessing("/api/bootstrap-claims/[claim_id]/reissue", "subject-a", "c4-key-0002", digest("b"), new Date(fixture.clock.now().getTime() + 1));
    const beforeLiveLease = fixture.snapshot();
    await expect(services.reissueClaim("subject-a", issued.claim_id, "c4-key-0002", digest("b"), sourceIpHash)).rejects.toMatchObject({ code: "request_in_progress" });
    expect(fixture.snapshot()).toBe(beforeLiveLease);
    const processing = [...fixture.state.idempotency.values()].find((record) => record.id === recordId);
    if (!processing) throw new Error("fixture processing record missing");
    processing.lockedUntil = new Date(fixture.clock.now().getTime() - 1);
    await services.reissueClaim("subject-a", issued.claim_id, "c4-key-0002", digest("b"), sourceIpHash);
    expect([...fixture.state.idempotency.values()].find((record) => record.id === recordId)).toMatchObject({ status: "completed", route: "/api/bootstrap-claims/[claim_id]/reissue" });
  });

  it("rejects cross-principal access without mutation", async () => {
    const fixture = new ClaimFixture();
    const services = fixture.services();
    const issued = await services.issueClaim("subject-a", key, digest("a"), sourceIpHash);
    const now = fixture.clock.now();
    fixture.state.entitlements.set("subject-b", { id: "entitlement-b", clerkSubject: "subject-b", product: ENTITLEMENT_PRODUCT, status: "active", source: "stripe_subscription", grantedAt: now, revokedAt: null, updatedAt: now, stripeCustomerId: "cus_fixture_b", stripeCheckoutSessionId: null, stripeSubscriptionId: "sub_fixture_b", lastEventCreatedAt: now, lastEventPrecedence: 50, lastStripeEventId: "evt_fixture_b" });
    const before = fixture.snapshot();
    await expect(services.reissueClaim("subject-b", issued.claim_id, "c4-key-0002", digest("b"), sourceIpHash)).rejects.toMatchObject({ code: "claim_not_found" });
    expect(fixture.snapshot()).toBe(before);
  });

  it("keeps elapsed claims unavailable and allows one redemption of a successful replacement", async () => {
    const fixture = new ClaimFixture();
    const services = fixture.services();
    const issued = await services.issueClaim("subject-a", key, digest("a"), sourceIpHash);
    const source = fixture.state.claims.get(issued.claim_id);
    if (!source) throw new Error("fixture source claim missing");
    source.expiresAt = new Date(fixture.clock.now().getTime() - 1);
    await expect(services.redeemClaim(issued.claim)).rejects.toMatchObject({ code: "claim_not_found" });
    const reissued = await services.reissueClaim("subject-a", issued.claim_id, "c4-key-0002", digest("b"), sourceIpHash);
    await expect(services.redeemClaim(reissued.claim)).resolves.toMatchObject({ subject: "subject-a", entitlement: "entitlement-a", product: "tester" });
    await expect(services.redeemClaim(reissued.claim)).rejects.toMatchObject({ code: "claim_not_found" });
  });
});
