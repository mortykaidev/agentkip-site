import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

const clerkAuth = vi.hoisted(() => vi.fn());
const stripeOperations = vi.hoisted(() => ({ retrieve: vi.fn(), customer: vi.fn(), checkout: vi.fn(), verify: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: clerkAuth }));
vi.mock("stripe", () => {
  class StripeSpy {
    static API_VERSION = "2025-06-30.basil";
    prices = { retrieve: stripeOperations.retrieve };
    customers = { create: stripeOperations.customer };
    checkout = { sessions: { create: stripeOperations.checkout } };
    webhooks = { constructEvent: stripeOperations.verify };
    constructor(_key: string, _options: unknown) {}
  }
  return { default: StripeSpy };
});

import { productionClerkAuth, requireClerkSubject } from "@/lib/w1/auth";
import { loadCheckoutConfig, loadClaimConfig, loadEntitlementConfig, loadRedeemConfig, loadWebhookConfig } from "@/lib/w1/config";
import { canonicalJson, constantTimeDigestEqual, deriveStripeIdempotencyKey, digestRequest, generateClaim, hashClaim, hashSourceIp, normalizeSourceIp, parseClaim, sourceIpBucketFromRequest } from "@/lib/w1/crypto";
import { createW1HttpHandlers, makeRequestId } from "@/lib/w1/http";
import { verifyInternalBearer, type InternalBearerCrypto } from "@/lib/w1/internal-auth";
import { createStripeCheckoutGateway, createStripeWebhookGateway } from "@/lib/w1/stripe";
import { throwingCloseEntitlementFactory } from "../helpers/w1";

type Env = Record<string, string | undefined>;
const sk = (n: number) => `sk_test_${"Ab9".repeat(Math.ceil(n / 3)).slice(0, n)}`;
const whsec = (n: number) => `whsec_${"Cd8".repeat(Math.ceil(n / 3)).slice(0, n)}`;
const price = (n: number) => `price_${"P7q".repeat(Math.ceil(n / 3)).slice(0, n)}`;
const product = (n: number) => `prod_${"R6s".repeat(Math.ceil(n / 3)).slice(0, n)}`;
const secret = (n: number, byte: number) => Buffer.alloc(n, byte).toString("base64url");
const noncanonicalBase64url = (value: string) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const last = alphabet.indexOf(value.at(-1)!);
  return `${value.slice(0, -1)}${alphabet[(last & ~3) | 1]}`;
};
const baseEnv = (): Env => ({
  DATABASE_URL: "postgres://test",
  STRIPE_SECRET_KEY: sk(24),
  STRIPE_WEBHOOK_SECRET: whsec(24),
  STRIPE_TESTER_PRICE_ID: price(8),
  STRIPE_TESTER_PRODUCT_ID: product(8),
  NEXT_PUBLIC_SITE_URL: "https://agentkip.test/",
  BOOTSTRAP_CLAIM_PEPPER_V1: secret(32, 1),
  BOOTSTRAP_RATE_LIMIT_PEPPER_V1: secret(32, 2),
  INTERNAL_BOOTSTRAP_CLAIM_REDEEM_TOKEN: secret(32, 3),
  NODE_ENV: "test",
});
const unavailable = (work: () => unknown) => expect(work).toThrow("configuration unavailable");

describe("W1 crypto and authentication foundation", () => {
  it("canonicalizes only descriptor-backed finite acyclic JSON values in code-point order", () => {
    expect(canonicalJson({ b: [2, 1], a: "x" })).toBe('{"a":"x","b":[2,1]}');
    expect(canonicalJson({ "𐀀": 2, "\uE000": 1 })).toBe('{"\uE000":1,"𐀀":2}');
    expect(canonicalJson({ "😀": 2, "\uFFFF": 1 })).toBe('{"\uFFFF":1,"😀":2}');
    expect(() => canonicalJson(Number.POSITIVE_INFINITY)).toThrow(TypeError);
    expect(() => canonicalJson(Number.NaN)).toThrow(TypeError);
    expect(() => canonicalJson(new Array(1))).toThrow(TypeError);
    for (const value of [new Date(), new Map(), new Set(), new (class Example {})(), { value: undefined }, { nested: new Set() }, [new Map()]]) expect(() => canonicalJson(value)).toThrow(TypeError);
    const objectGetter = { calls: 0, value: 1 };
    Object.defineProperty(objectGetter, "getter", { enumerable: true, get() { objectGetter.calls += 1; return 2; } });
    const arrayGetter: unknown[] & { calls?: number } = [1];
    arrayGetter.calls = 0;
    Object.defineProperty(arrayGetter, "0", { enumerable: true, get() { arrayGetter.calls! += 1; return 2; } });
    for (const value of [objectGetter, arrayGetter, { [Symbol("x")]: 1 }, Object.assign([1], { [Symbol("x")]: 1 })]) expect(() => canonicalJson(value)).toThrow(TypeError);
    expect(objectGetter.calls).toBe(0);
    expect(arrayGetter.calls).toBe(0);
    const recursive: { self?: unknown } = {}; recursive.self = recursive;
    const recursiveArray: unknown[] = []; recursiveArray.push(recursiveArray);
    expect(() => canonicalJson(recursive)).toThrow(TypeError);
    expect(() => canonicalJson(recursiveArray)).toThrow(TypeError);
    expect(() => canonicalJson({ nested: [1, Number.NEGATIVE_INFINITY] })).toThrow(TypeError);
  });

  it("uses exact UTF-8 canonical digest input and deterministic provider keys", () => {
    const body = { product: "tester", note: "é" };
    const expected = createHash("sha256").update('w1\nPOST\n/api/billing/checkout\n{"note":"é","product":"tester"}', "utf8").digest("hex");
    expect(digestRequest("post", "/api/billing/checkout", body)).toBe(expected);
    expect(deriveStripeIdempotencyKey("customer", "user_123")).toBe("agentkip:w1:customer:80fba0ae1c48e3978e43e4efc365e14e12ea0c830ba8ba5b9a2dafc7e3f2ab8b");
    expect(deriveStripeIdempotencyKey("checkout", "10000000-0000-4000-8000-000000000001")).toBe("agentkip:w1:checkout:10000000-0000-4000-8000-000000000001");
  });

  it("round-trips canonical claims, rejects malformed variants, and wipes generated bytes", () => {
    const source = new Uint8Array(32).fill(7);
    const generated = generateClaim({ randomUUID: () => "10000000-0000-4000-8000-000000000001", randomBytes: () => source });
    const [, idSegment, secretSegment] = generated.claim.split(".");
    expect(generated.claim).toBe("akc1.EAAAAAAAQACAAAAAAAAAAQ.BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc");
    expect(parseClaim(generated.claim)).toEqual(generated);
    for (const candidate of [
      generated.claim.replace("akc1", "akc2"),
      `akc1.${idSegment}`, `akc1.${idSegment}.${secretSegment}.extra`, `akc1.${idSegment}=${""}.${secretSegment}`,
      `akc1.${idSegment!.slice(0, -1)}!.${secretSegment}`, `akc1.${idSegment}.${secretSegment!.slice(0, -1)}!`,
      `akc1.${idSegment!.slice(1)}.${secretSegment}`, `akc1.${idSegment}.${secretSegment!.slice(1)}`,
      `akc1.${noncanonicalBase64url(idSegment!)}.${secretSegment}`, `akc1.${idSegment}.${noncanonicalBase64url(secretSegment!)}`,
    ]) expect(parseClaim(candidate)).toBeNull();
    expect([...source]).toEqual(new Array(32).fill(0));
  });

  it("uses known purpose-separated HMAC outputs and zeroes digest buffers", () => {
    const claim = "akc1.EAAAAAAAQACAAAAAAAAAAQ.BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc";
    expect(hashClaim(claim, secret(32, 1))).toBe("c1d0ef491ecfc11ab9090ee65a633e800b491d56d039e1818fd7f1b006970e37");
    expect(hashSourceIp("192.0.2.1", secret(32, 1))).toBe("64e520cde6809f5cb2ca2e82976b5151d7bcfb14227414008ec13c99b32c674c");
    expect(hashClaim(claim, secret(32, 1))).not.toBe(hashClaim(claim, secret(32, 2)));
    expect(constantTimeDigestEqual("same", "same")).toBe(true);
    expect(constantTimeDigestEqual("same", "different")).toBe(false);
  });

  it("normalizes only trusted first-hop source-IP forms", () => {
    expect(normalizeSourceIp(" 192.0.2.1 ")).toBe("192.0.2.1");
    expect(normalizeSourceIp("192.0.2.1:443")).toBe("192.0.2.1");
    expect(normalizeSourceIp("[2001:0db8:0:0:0:0:2:1]")).toBe("2001:db8::2:1");
    expect(normalizeSourceIp("[2001:0db8:0:0:0:0:2:1]:443")).toBe("2001:db8::2:1");
    expect(normalizeSourceIp("2001:0:0:1:0:0:1:1")).toBe("2001::1:0:0:1:1");
    expect(normalizeSourceIp("::ffff:192.0.2.128")).toBe("::ffff:c000:280");
    for (const candidate of ["", "[not-an-address]", "[::1", "::1]", "[::1]:0", "[::1]:01", "[::1]:65536", "192.0.2.1:0", "192.0.2.1:01", "192.0.2.1:65536", "192.0.2.1:abc", "198.51.100.1, 203.0.113.1"]) expect(normalizeSourceIp(candidate)).toBe("unknown");
    expect(sourceIpBucketFromRequest(new Headers({ "x-forwarded-for": "198.51.100.7, 203.0.113.8" }), true)).toBe("198.51.100.7");
    expect(sourceIpBucketFromRequest(new Headers({ "x-forwarded-for": "not-an-address, 198.51.100.7" }), true)).toBe("unknown");
    expect(sourceIpBucketFromRequest(new Headers({ "x-forwarded-for": "198.51.100.7, [::1]:bogus" }), true)).toBe("198.51.100.7");
    expect(sourceIpBucketFromRequest(new Headers({ "x-forwarded-for": ", 198.51.100.7" }), true)).toBe("unknown");
    expect(sourceIpBucketFromRequest(new Headers(), true)).toBe("unknown");
    expect(sourceIpBucketFromRequest(new Headers({ "x-forwarded-for": "198.51.100.7" }), false)).toBe("unknown");
  });

  it("is lazy and keeps route-only configuration and capabilities separate", async () => {
    const env = baseEnv();
    const { STRIPE_WEBHOOK_SECRET: _webhook, ...checkoutEnv } = env;
    const { NEXT_PUBLIC_SITE_URL: _origin, ...webhookEnv } = env;
    expect(loadEntitlementConfig({ DATABASE_URL: env.DATABASE_URL })).toEqual({ databaseUrl: env.DATABASE_URL });
    const checkout = loadCheckoutConfig(checkoutEnv);
    const webhook = loadWebhookConfig(webhookEnv);
    expect(checkout.successUrl).toBe("https://agentkip.test/account?checkout=success");
    expect("stripeWebhookSecret" in checkout).toBe(false);
    expect(webhook.stripeWebhookSecret).toBe(whsec(24));
    expect("siteOrigin" in webhook).toBe(false);
    expect("successUrl" in webhook).toBe(false);
    expect("cancelUrl" in webhook).toBe(false);
    const descriptor = Object.getOwnPropertyDescriptor(process, "env")!;
    vi.resetModules();
    Object.defineProperty(process, "env", { configurable: true, get: () => { throw new Error("import read"); } });
    try { await expect(import("@/lib/w1/config")).resolves.toHaveProperty("loadEntitlementConfig"); } finally { Object.defineProperty(process, "env", descriptor); }
  });

  it("enforces exact required strings, Stripe syntax, and route separation", () => {
    const env = baseEnv();
    const loaders: Array<[ (value: Env) => unknown, string[] ]> = [
      [loadEntitlementConfig, ["DATABASE_URL"]],
      [loadCheckoutConfig, ["DATABASE_URL", "STRIPE_SECRET_KEY", "STRIPE_TESTER_PRICE_ID", "STRIPE_TESTER_PRODUCT_ID", "NEXT_PUBLIC_SITE_URL"]],
      [loadWebhookConfig, ["DATABASE_URL", "STRIPE_SECRET_KEY", "STRIPE_TESTER_PRICE_ID", "STRIPE_TESTER_PRODUCT_ID", "STRIPE_WEBHOOK_SECRET"]],
      [loadClaimConfig, ["DATABASE_URL", "BOOTSTRAP_CLAIM_PEPPER_V1", "BOOTSTRAP_RATE_LIMIT_PEPPER_V1"]],
      [loadRedeemConfig, ["DATABASE_URL", "BOOTSTRAP_CLAIM_PEPPER_V1", "BOOTSTRAP_RATE_LIMIT_PEPPER_V1", "INTERNAL_BOOTSTRAP_CLAIM_REDEEM_TOKEN"]],
    ];
    for (const [load, keys] of loaders) for (const key of keys) for (const invalid of [undefined, "", " ", "\t", ` ${env[key]!}`, `${env[key]!} `]) unavailable(() => load({ ...env, [key]: invalid }));
    expect(loadClaimConfig({ DATABASE_URL: env.DATABASE_URL, BOOTSTRAP_CLAIM_PEPPER_V1: env.BOOTSTRAP_CLAIM_PEPPER_V1, BOOTSTRAP_RATE_LIMIT_PEPPER_V1: env.BOOTSTRAP_RATE_LIMIT_PEPPER_V1 }).databaseUrl).toBe(env.DATABASE_URL);
    expect(loadRedeemConfig({ DATABASE_URL: env.DATABASE_URL, BOOTSTRAP_CLAIM_PEPPER_V1: env.BOOTSTRAP_CLAIM_PEPPER_V1, BOOTSTRAP_RATE_LIMIT_PEPPER_V1: env.BOOTSTRAP_RATE_LIMIT_PEPPER_V1, INTERNAL_BOOTSTRAP_CLAIM_REDEEM_TOKEN: env.INTERNAL_BOOTSTRAP_CLAIM_REDEEM_TOKEN }).databaseUrl).toBe(env.DATABASE_URL);
    for (const n of [24, 25, 64, 128]) expect(() => loadCheckoutConfig({ ...env, STRIPE_SECRET_KEY: sk(n) })).not.toThrow();
    for (const n of [24, 25, 64, 128]) expect(() => loadWebhookConfig({ ...env, STRIPE_WEBHOOK_SECRET: whsec(n) })).not.toThrow();
    for (const n of [8, 9, 24, 64]) { expect(() => loadCheckoutConfig({ ...env, STRIPE_TESTER_PRICE_ID: price(n) })).not.toThrow(); expect(() => loadCheckoutConfig({ ...env, STRIPE_TESTER_PRODUCT_ID: product(n) })).not.toThrow(); }
    for (const invalid of [sk(23), sk(129), `sk_live_${"A".repeat(24)}`, `pk_test_${"A".repeat(24)}`, `rk_test_${"A".repeat(24)}`, `SK_TEST_${"A".repeat(24)}`, `sk_test_${"A".repeat(23)}_`, `sk_test_${"A".repeat(23)}-`, `sk_test_${"A".repeat(23)}=`, `sk_test_${"A".repeat(23)}é`]) unavailable(() => loadCheckoutConfig({ ...env, STRIPE_SECRET_KEY: invalid }));
    for (const invalid of [whsec(23), whsec(129), `WHSEC_${"A".repeat(24)}`, `whsec_${"A".repeat(23)}_`, `whsec_${"A".repeat(23)}-`, `whsec_${"A".repeat(23)}=`, `whsec_${"A".repeat(23)}é`]) unavailable(() => loadWebhookConfig({ ...env, STRIPE_WEBHOOK_SECRET: invalid }));
    for (const invalid of [price(7), price(65), product(8), "PRICE_ABCDEFGH", "price_ABCDEFG_", "price_ABCDEFG-", "price_ABCDEFG=", "price_ABCDEFGé"]) unavailable(() => loadCheckoutConfig({ ...env, STRIPE_TESTER_PRICE_ID: invalid }));
    for (const invalid of [product(7), product(65), price(8), "PROD_ABCDEFGH", "prod_ABCDEFG_", "prod_ABCDEFG-", "prod_ABCDEFG=", "prod_ABCDEFGé"]) unavailable(() => loadCheckoutConfig({ ...env, STRIPE_TESTER_PRODUCT_ID: invalid }));
    expect(() => loadCheckoutConfig({ ...env, STRIPE_TESTER_PRICE_ID: "price_Opaque123" })).not.toThrow();
  });

  it("validates local DSN, canonical secrets, equality, and exact site origins", () => {
    const env = baseEnv();
    for (const value of ["postgres://test", "postgresql://user:pass@example.com/db?sslmode=require", "postgres://user:p%40ss@[::1]:5432/db", "postgres://example.com:1", "postgres://example.com:65535", "postgresql://example.com"]) expect(loadEntitlementConfig({ DATABASE_URL: value }).databaseUrl).toBe(value);
    const dsn4096 = `postgres://example.com/${"a".repeat(4096 - Buffer.byteLength("postgres://example.com/", "utf8"))}`;
    expect(loadEntitlementConfig({ DATABASE_URL: dsn4096 }).databaseUrl).toBe(dsn4096);
    for (const value of [dsn4096 + "a", "mysql://example.com", "POSTGRES://example.com", "postgres:example.com", "postgres:///db", "postgres://example.com/#fragment", "postgres://example.com/a b", "postgres://example.com:0", "postgres://example.com:00", "postgres://example.com:01", "postgres://example.com:65536", "postgres://example.com:+1", "postgres://example.com:-1", "postgres://example.com:1.5", "postgres://example.com:", "postgres://example.com:abc"]) unavailable(() => loadEntitlementConfig({ DATABASE_URL: value }));
    for (const [key, byte] of [["BOOTSTRAP_CLAIM_PEPPER_V1", 4], ["BOOTSTRAP_RATE_LIMIT_PEPPER_V1", 5], ["INTERNAL_BOOTSTRAP_CLAIM_REDEEM_TOKEN", 6]] as const) {
      for (const n of [32, 33, 191, 192]) expect(() => loadRedeemConfig({ ...env, [key]: secret(n, byte) })).not.toThrow();
      for (const invalid of [secret(31, byte), secret(193, byte), "A".repeat(42), "A".repeat(257), `${secret(32, byte)}=`, secret(32, byte).replace(/.$/, "+"), secret(32, byte).replace(/.$/, "/"), ` ${secret(32, byte)}`, `${secret(32, byte)} `, noncanonicalBase64url(secret(32, byte))]) unavailable(() => loadRedeemConfig({ ...env, [key]: invalid }));
    }
    unavailable(() => loadClaimConfig({ ...env, BOOTSTRAP_RATE_LIMIT_PEPPER_V1: env.BOOTSTRAP_CLAIM_PEPPER_V1 }));
    for (const values of [
      { INTERNAL_BOOTSTRAP_CLAIM_REDEEM_TOKEN: env.BOOTSTRAP_CLAIM_PEPPER_V1 },
      { INTERNAL_BOOTSTRAP_CLAIM_REDEEM_TOKEN: env.BOOTSTRAP_RATE_LIMIT_PEPPER_V1 },
      { BOOTSTRAP_RATE_LIMIT_PEPPER_V1: env.INTERNAL_BOOTSTRAP_CLAIM_REDEEM_TOKEN },
      { BOOTSTRAP_RATE_LIMIT_PEPPER_V1: env.BOOTSTRAP_CLAIM_PEPPER_V1, INTERNAL_BOOTSTRAP_CLAIM_REDEEM_TOKEN: env.BOOTSTRAP_CLAIM_PEPPER_V1 },
    ]) unavailable(() => loadRedeemConfig({ ...env, ...values }));
    const buffers: Buffer[] = [];
    const from = vi.spyOn(Buffer, "from");
    try {
      loadClaimConfig(env);
      unavailable(() => loadRedeemConfig({ ...env, INTERNAL_BOOTSTRAP_CLAIM_REDEEM_TOKEN: noncanonicalBase64url(secret(32, 3)) }));
      for (const result of from.mock.results) if (result.type === "return" && Buffer.isBuffer(result.value)) buffers.push(result.value);
      expect(buffers.length).toBeGreaterThan(0);
      expect(buffers.every((buffer) => buffer.every((byte) => byte === 0))).toBe(true);
    } finally { from.mockRestore(); }
    for (const value of ["https://example.com", "https://example.com/", "https://example.com:443/", "https://example.com:8443", "https://example.com:1", "https://example.com:65535"]) expect(loadCheckoutConfig({ ...env, NEXT_PUBLIC_SITE_URL: value, NODE_ENV: "production" }).siteOrigin).toBe(new URL(value).origin);
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) for (const scheme of ["http", "https"]) for (const suffix of ["", "/", ":1", ":3000/", ":65535"]) expect(() => loadCheckoutConfig({ ...env, NEXT_PUBLIC_SITE_URL: `${scheme}://${host}${suffix}`, NODE_ENV: "test" })).not.toThrow();
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) for (const scheme of ["http", "https"]) for (const suffix of ["", "/", ":1", ":3000/", ":65535"]) unavailable(() => loadCheckoutConfig({ ...env, NEXT_PUBLIC_SITE_URL: `${scheme}://${host}${suffix}`, NODE_ENV: "production" }));
    for (const value of ["http://example.com", "http://example.com:3000", "https://LOCALHOST", "https://localhost.", "https://x.localhost", "https://127.1", "https://127.0.0.2", "https://0x7f000001", "https://[0:0:0:0:0:0:0:1]", "https://[::ffff:127.0.0.1]", "https://user@example.com", "https://:pass@example.com", "https://@example.com", "https://example.com/account", "https://example.com//", "https://example.com/%2e", "https://example.com?", "https://example.com#", "https://example.com:0", "https://example.com:00", "https://example.com:01", "https://example.com:65536", "https://example.com:+1", "https://example.com:1.5", "https://example.com:", "https://example.com:abc", "https://[::1", "https://::1", " HTTPS://example.com", "HTTPS://example.com", "https://example.com/a b"]) for (const mode of ["test", "production"]) unavailable(() => loadCheckoutConfig({ ...env, NEXT_PUBLIC_SITE_URL: value, NODE_ENV: mode }));
    expect(loadCheckoutConfig({ ...env, NEXT_PUBLIC_SITE_URL: "https://192.168.1.1", NODE_ENV: "test" }).siteOrigin).toBe("https://192.168.1.1");
  });

  it("constructs exact route Stripe ports without provider calls or opposite-route methods", () => {
    const env = baseEnv();
    const { STRIPE_WEBHOOK_SECRET: _webhook, ...checkoutEnv } = env;
    const { NEXT_PUBLIC_SITE_URL: _origin, ...webhookEnv } = env;
    stripeOperations.retrieve.mockClear(); stripeOperations.customer.mockClear(); stripeOperations.checkout.mockClear(); stripeOperations.verify.mockClear();
    const checkout = createStripeCheckoutGateway(loadCheckoutConfig(checkoutEnv));
    const webhook = createStripeWebhookGateway(loadWebhookConfig(webhookEnv));
    expect(Object.keys(checkout).sort()).toEqual(["createCheckout", "createCustomer", "validateConfiguredPrice"]);
    expect(Object.keys(webhook).sort()).toEqual(["loadAuthorityBundle", "verifyWebhook"]);
    expect("verifyWebhook" in checkout).toBe(false);
    expect("createCheckout" in webhook).toBe(false);
    expect([stripeOperations.retrieve, stripeOperations.customer, stripeOperations.checkout, stripeOperations.verify].every((operation) => operation.mock.calls.length === 0)).toBe(true);
  });

  it("uses only the production Clerk userId and maps missing outcomes to unauthorized", async () => {
    clerkAuth.mockResolvedValue({ userId: "user_only", actor: { id: "actor_secret" }, orgId: "org_secret", sessionClaims: { sub: "other" } });
    await expect(productionClerkAuth.subject()).resolves.toBe("user_only");
    for (const subject of [undefined, null, "", "  "]) await expect(requireClerkSubject({ subject: async () => subject })).rejects.toMatchObject({ code: "unauthorized", status: 401 });
    await expect(requireClerkSubject({ subject: async () => { throw new Error("unavailable"); } })).rejects.toMatchObject({ code: "unauthorized", status: 401 });
    await expect(requireClerkSubject({ subject: async () => "user_123" })).resolves.toBe("user_123");
  });

  it("hashes both bearer sides, compares once, and zeroes every observable digest buffer", () => {
    const configured = secret(32, 9);
    const cases = [null, `Bearer ${noncanonicalBase64url(secret(32, 8))}`, `Bearer ${secret(32, 8)}`, `Bearer ${configured}`];
    for (const authorization of cases) {
      const buffers: Buffer[] = []; let hashes = 0; let comparisons = 0;
      const crypto: InternalBearerCrypto = { sha256(value) { hashes += 1; const result = createHash("sha256").update(value).digest(); buffers.push(result); return result; }, equal(left, right) { comparisons += 1; return left.equals(right); } };
      expect(verifyInternalBearer(new Headers(authorization ? { authorization } : undefined), configured, crypto)).toBe(authorization === `Bearer ${configured}`);
      expect(hashes).toBe(2); expect(comparisons).toBe(1); expect(buffers.every((buffer) => buffer.every((byte) => byte === 0))).toBe(true);
    }
  });

  it("accepts only canonical request IDs and contains close failures after success or primary failure", async () => {
    const good = "10000000-0000-4000-8000-0000000000AB";
    expect(makeRequestId(new Request("https://agentkip.test", { headers: { "x-request-id": good } }))).toBe(good.toLowerCase());
    for (const value of [undefined, "", " ", `${good},${good}`, `{${good}}`, "10000000-0000-0000-8000-000000000001", "10000000-0000-4000-7000-000000000001", "not-a-uuid"]) expect(makeRequestId(new Request("https://agentkip.test", { headers: value === undefined ? undefined : { "x-request-id": value } }))).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    for (const primaryFailure of [undefined, new Error("primary raw cause secret")]) {
      const factory = throwingCloseEntitlementFactory(primaryFailure);
      const response = await createW1HttpHandlers(factory, { subject: async () => "user_123" }).entitlement(new Request("https://agentkip.test/api/entitlement"));
      const text = await response.text();
      expect(response.status).toBe(primaryFailure ? 503 : 200);
      expect(factory.closeCalls).toBe(1);
      expect(text).not.toContain("secret");
      expect(text).not.toContain("raw cause");
      expect(text).not.toContain("close failure");
    }
  });
});
