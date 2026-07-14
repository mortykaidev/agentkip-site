import { describe, expect, it } from "vitest";
import { createW1HttpHandlers, readBoundedWebhookText, readStrictJsonObject } from "@/lib/w1/http";
import { WEBHOOK_BODY_LIMIT_BYTES } from "@/lib/w1/constants";
import { decideIdempotency, decodeIdempotencyRecord, validateResponseMetadata, type IdempotencyRecord } from "@/lib/w1/idempotency";

describe("W1 strict HTTP", () => {
  it("rejects duplicate keys", async () => { await expect(readStrictJsonObject(new Request("http://test/", { method: "POST", body: '{"a":1,"a":2}' }))).rejects.toThrow(); });
  it("parses exact objects", async () => { await expect(readStrictJsonObject(new Request("http://test/", { method: "POST", body: "{}" }))).resolves.toEqual({}); });
});

describe("W1 idempotency metadata", () => {
  const claimId = "a0000000-a000-4000-8000-000000000001";
  const expiresAt = "2026-07-14T00:00:00.000Z";
  const checkout = () => ({ checkoutUrl: "https://checkout.stripe.com/c/pay/test?opaque=1#provider-state", expiresAt });
  const issue = () => ({ claim_id: claimId, status: "active", expires_at: expiresAt, replayable: false, revoke_path: `/api/bootstrap-claims/${claimId}/revoke`, reissue_path: `/api/bootstrap-claims/${claimId}/reissue` });
  const revoke = (status: "revoked" | "expired" = "revoked") => ({ claim_id: claimId, status, expires_at: expiresAt, replayable: false, reissue_path: `/api/bootstrap-claims/${claimId}/reissue` });
  const routes = ["/api/billing/checkout", "/api/bootstrap-claims", "/api/bootstrap-claims/[claim_id]/reissue", "/api/bootstrap-claims/[claim_id]/revoke"] as const;

  it("accepts exact checkout, issue, reissue, revoked, and expired replay metadata", () => {
    expect(validateResponseMetadata("/api/billing/checkout", checkout())).toEqual(checkout());
    expect(validateResponseMetadata("/api/billing/checkout", { checkoutUrl: "https://checkout.stripe.com/", expiresAt })).toEqual({ checkoutUrl: "https://checkout.stripe.com/", expiresAt });
    expect(validateResponseMetadata("/api/bootstrap-claims", issue())).toEqual(issue());
    expect(validateResponseMetadata("/api/bootstrap-claims/[claim_id]/reissue", issue())).toEqual(issue());
    expect(validateResponseMetadata("/api/bootstrap-claims/[claim_id]/revoke", revoke("revoked"))).toEqual(revoke("revoked"));
    expect(validateResponseMetadata("/api/bootstrap-claims/[claim_id]/revoke", revoke("expired"))).toEqual(revoke("expired"));
  });

  it("table-drives every route through malformed object boundaries without invoking accessors", () => {
    const valid = (route: typeof routes[number]) => route === "/api/billing/checkout" ? checkout() : route === "/api/bootstrap-claims/[claim_id]/revoke" ? revoke() : issue();
    for (const route of routes) {
      const candidate = valid(route);
      for (const key of Object.keys(candidate)) {
        const missing = Object.fromEntries(Object.entries(candidate).filter(([candidateKey]) => candidateKey !== key));
        expect(() => validateResponseMetadata(route, missing)).toThrow();
        expect(() => validateResponseMetadata(route, { ...candidate, [key]: 1 })).toThrow();
      }
      expect(() => validateResponseMetadata(route, { ...candidate, extra: true })).toThrow();
      const hidden = { ...candidate }; Object.defineProperty(hidden, "hidden", { enumerable: false, value: true });
      expect(() => validateResponseMetadata(route, hidden)).toThrow();
      expect(() => validateResponseMetadata(route, { ...candidate, [Symbol("extra")]: true })).toThrow();
      const accessor = { ...candidate }; Object.defineProperty(accessor, Object.keys(candidate)[0], { enumerable: true, get: () => { throw new Error("getter invoked"); } });
      expect(() => validateResponseMetadata(route, accessor)).toThrow(/invalid response metadata/);
      expect(() => validateResponseMetadata(route, Object.create(candidate))).toThrow();
      for (const malformed of [[], null, false, 0, "metadata"]) expect(() => validateResponseMetadata(route, malformed)).toThrow();
      expect(() => validateResponseMetadata(route, route === "/api/bootstrap-claims/[claim_id]/revoke" ? issue() : revoke())).toThrow();
    }
  });

  it("rejects noncanonical UUIDs, paths, dates, URL serializations, and sensitive fields", () => {
    for (const badId of [claimId.toUpperCase(), "00000000-0000-1000-8000-000000000001", "00000000-0000-2000-8000-000000000001", "00000000-0000-3000-8000-000000000001", "00000000-0000-5000-8000-000000000001", "00000000-0000-6000-8000-000000000001", "00000000-0000-4000-7000-000000000001", claimId.slice(0, -1), `${claimId}0`, `{${claimId}}`, ` ${claimId}`]) expect(() => validateResponseMetadata("/api/bootstrap-claims", { ...issue(), claim_id: badId })).toThrow();
    for (const badDate of ["2026-07-14T00:00:00Z", "2026-07-14T00:00:00.000+00:00", "2026-02-30T00:00:00.000Z", "2026-07-14T00:00:00.0000Z", ` ${expiresAt}`, 1]) expect(() => validateResponseMetadata("/api/bootstrap-claims", { ...issue(), expires_at: badDate })).toThrow();
    for (const badPath of ["/api/bootstrap-claims/not-the-claim/reissue", `/api/bootstrap-claims/${claimId}/revoke`, `/api/bootstrap-claims/${claimId}/reissue?x=1`, `/api/bootstrap-claims/${claimId}/reissue#x`, "/api/bootstrap-claims/../reissue", "https://test/api/bootstrap-claims/x/reissue", `/api/bootstrap-claims/${claimId.replaceAll("-", "%2D")}/reissue`]) expect(() => validateResponseMetadata("/api/bootstrap-claims", { ...issue(), reissue_path: badPath })).toThrow();
    for (const url of ["http://checkout.stripe.com/c/pay/test", "https://checkout.stripe.com.evil.invalid/c/pay/test", "https://CHECKOUT.STRIPE.COM/c/pay/test", "https://xn--checkout-stripe-9d0c.com/c/pay/test", "https://user@checkout.stripe.com/c/pay/test", "https://checkout.stripe.com:443/c/pay/test", "https://checkout.stripe.com:444/c/pay/test", "//checkout.stripe.com/c/pay/test", "https://checkout.stripe.com\\@evil.invalid/", "https://checkout.stripe.com/%2e%2e/c/pay/test", ` ${checkout().checkoutUrl}`, "https://checkout.stripe.com/c/pay/test\n"]) expect(() => validateResponseMetadata("/api/billing/checkout", { ...checkout(), checkoutUrl: url })).toThrow();
    for (const sensitive of ["claim", "claim_hash", "token", "secret"]) expect(() => validateResponseMetadata("/api/bootstrap-claims", { ...issue(), [sensitive]: "forbidden" })).toThrow();
  });

  it("checks a conflicting digest before any lease decision", () => {
    const record: IdempotencyRecord<"/api/billing/checkout"> = { id: claimId, route: "/api/billing/checkout", principal: "principal", idempotencyKey: "key-key-key", requestDigest: "a".repeat(64), status: "processing", responseStatus: null, responseMetadata: null, lockedUntil: new Date("2026-07-13T00:10:00.000Z"), expiresAt: new Date("2026-07-14T00:00:00.000Z") };
    expect(() => decideIdempotency(record, "b".repeat(64), new Date("2026-07-13T00:00:00.000Z"))).toThrow(/conflicts/);
  });

  it("decodes only exact route-bound database rows", () => {
    const identity = { route: "/api/billing/checkout" as const, principal: "principal", idempotencyKey: "key-key-key" };
    const row = { id: claimId, ...identity, requestDigest: "a".repeat(64), status: "processing", responseStatus: null, responseMetadata: null, lockedUntil: Date.parse("2026-07-13T00:10:00.000Z"), expiresAt: Date.parse("2026-07-14T00:00:00.000Z") };
    const decoded = decodeIdempotencyRecord(row, identity);
    expect(decoded.lockedUntil?.getTime()).toBe(row.lockedUntil);
    expect(decoded.expiresAt.getTime()).toBe(row.expiresAt);
    expect(decoded.lockedUntil).not.toBe(row.lockedUntil);
    expect(decoded.expiresAt).not.toBe(row.expiresAt);
    for (const bad of [false, 0, "", null, [], { ...row, responseMetadata: false }, { ...row, responseMetadata: 0 }, { ...row, responseMetadata: "" }, { ...row, responseMetadata: [] }, { ...row, responseStatus: 200 }, { ...row, lockedUntil: null }, { ...row, lockedUntil: Number.NaN }, { ...row, requestDigest: "A".repeat(64) }, { ...row, id: claimId.toUpperCase() }, { ...row, expiresAt: Number.POSITIVE_INFINITY }]) {
      expect(() => decodeIdempotencyRecord(bad, identity)).toThrow();
    }
    const hidden = { ...row }; Object.defineProperty(hidden, "hidden", { enumerable: false, value: true });
    const getter = { ...row }; Object.defineProperty(getter, "id", { enumerable: true, get: () => { throw new Error("getter invoked"); } });
    expect(() => decodeIdempotencyRecord(hidden, identity)).toThrow();
    expect(() => decodeIdempotencyRecord({ ...row, [Symbol("row")]: true }, identity)).toThrow();
    expect(() => decodeIdempotencyRecord(getter, identity)).toThrow(/invalid idempotency row/);
    const completed = { ...row, status: "completed", responseStatus: 200, responseMetadata: checkout(), lockedUntil: null };
    expect(decodeIdempotencyRecord(completed, identity).responseMetadata).toEqual(completed.responseMetadata);
    expect(() => decodeIdempotencyRecord({ ...completed, responseMetadata: null }, identity)).toThrow();
    expect(() => decodeIdempotencyRecord({ ...completed, responseMetadata: false }, identity)).toThrow();
    for (const [route, responseStatus, responseMetadata] of [
      ["/api/billing/checkout", 200, checkout()],
      ["/api/bootstrap-claims", 201, issue()],
      ["/api/bootstrap-claims/[claim_id]/reissue", 201, issue()],
      ["/api/bootstrap-claims/[claim_id]/revoke", 200, revoke("revoked")],
    ] as const) {
      const routeIdentity = { route, principal: "principal", idempotencyKey: "key-key-key" };
      const completedRow = { id: claimId, ...routeIdentity, requestDigest: "a".repeat(64), status: "completed", responseStatus, responseMetadata, lockedUntil: null, expiresAt: row.expiresAt };
      expect(decodeIdempotencyRecord(completedRow, routeIdentity).responseMetadata).toEqual(responseMetadata);
      expect(() => decodeIdempotencyRecord({ ...completedRow, responseStatus: 299 }, routeIdentity)).toThrow();
      expect(() => decodeIdempotencyRecord({ ...completedRow, lockedUntil: row.lockedUntil }, routeIdentity)).toThrow();
      const wrongRoute = route === "/api/billing/checkout" ? "/api/bootstrap-claims" : "/api/billing/checkout";
      expect(() => decodeIdempotencyRecord({ ...completedRow, route: wrongRoute }, routeIdentity)).toThrow();
    }
  });
});

describe("W1 C5 bounded webhook fulfillment", () => {
  it("passes the exact unparsed raw body to signature verification before fulfillment", async () => {
    const raw = "{not-json}";
    const seen: Array<[string, string]> = [];
    const repository = { transaction: async () => { throw new Error("not reached"); }, cleanupExpiredProcessingIdempotency: async () => {}, readEntitlement: async () => null, close: async () => {} };
    const factory = { create: async () => ({ repository, webhookStripe: { verifyWebhook: (body: string, signature: string) => { seen.push([body, signature]); throw new Error("signature rejected"); }, loadAuthorityBundle: async () => { throw new Error("not reached"); } }, close: async () => {} }) } as never;
    const response = await createW1HttpHandlers(factory).webhook(new Request("http://test/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "test-signature", "x-request-id": "10000000-0000-4000-8000-000000000001" }, body: raw }));
    expect(seen).toEqual([[raw, "test-signature"]]);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "invalid_webhook", message: "Invalid webhook.", requestId: "10000000-0000-4000-8000-000000000001" } });
  });

  it("rejects malformed declared lengths before a webhook scope exists and bounds understated streams", async () => {
    let scopes = 0;
    const factory = { create: async () => { scopes += 1; throw new Error("scope must not exist"); } } as never;
    for (const contentLength of ["-1", "01", String(WEBHOOK_BODY_LIMIT_BYTES + 1)]) {
      const response = await createW1HttpHandlers(factory).webhook(new Request("http://test/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "sig", "content-length": contentLength }, body: "x" }));
      expect(response.status).toBe(400);
    }
    expect(scopes).toBe(0);
    let canceled = false;
    const body = new ReadableStream<Uint8Array>({ pull(controller) { controller.enqueue(new Uint8Array(WEBHOOK_BODY_LIMIT_BYTES)); controller.enqueue(new Uint8Array([1])); }, cancel() { canceled = true; } });
    await expect(readBoundedWebhookText(new Request("http://test/", { method: "POST", headers: { "content-length": "1" }, body, duplex: "half" } as never))).rejects.toThrow();
    expect(canceled).toBe(true);
  });

  it("keeps malformed UTF-8 and missing signatures outside the webhook scope", async () => {
    let scopes = 0;
    const factory = { create: async () => { scopes += 1; throw new Error("scope must not exist"); } } as never;
    const invalidUtf8 = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array([0xc3, 0x28])); controller.close(); } });
    const utf8Response = await createW1HttpHandlers(factory).webhook(new Request("http://test/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "sig" }, body: invalidUtf8, duplex: "half" } as never));
    const signatureResponse = await createW1HttpHandlers(factory).webhook(new Request("http://test/api/stripe/webhook", { method: "POST", body: "{}" }));
    expect(utf8Response.status).toBe(400);
    expect(signatureResponse.status).toBe(400);
    expect(scopes).toBe(0);
  });
});
