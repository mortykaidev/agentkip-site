import { describe, expect, it } from "vitest";

import { createDownloadManifestHandler } from "@/lib/downloads/manifest";
import type { ClerkAuthPort } from "@/lib/w1/auth";
import type { EntitlementViewRow, W1Repository } from "@/lib/w1/repository";
import type {
  W1CheckoutRequestScope,
  W1ClaimRequestScope,
  W1EntitlementRequestScope,
  W1RedeemRequestScope,
  W1RequestScope,
  W1RequestScopeFactory,
  W1WebhookRequestScope,
} from "@/lib/w1/services";
import { expectNoStore } from "../helpers/w1";

const MANIFEST_URL =
  "https://agentkip.test/api/downloads/manifest?platform=macos&architecture=arm64";
const REQUEST_ID = "10000000-0000-4000-8000-000000000001";

function entitlement(status: EntitlementViewRow["status"]): EntitlementViewRow {
  const now = new Date("2026-07-16T00:00:00.000Z");
  return {
    id: "20000000-0000-4000-8000-000000000001",
    clerkSubject: "user_manifest",
    product: "agentkip_first_friend",
    status,
    source: "stripe_subscription",
    grantedAt: status === "active" || status === "past_due" ? now : null,
    revokedAt: status === "revoked" ? now : null,
    updatedAt: now,
    stripeCustomerId: "cus_manifest",
    stripeCheckoutSessionId: null,
    stripeSubscriptionId: "sub_manifest",
    lastEventCreatedAt: now,
    lastEventPrecedence: 50,
    lastStripeEventId: "evt_manifest",
  };
}

class ManifestScopeFactory implements W1RequestScopeFactory {
  createCalls = 0;
  readCalls: string[] = [];
  closeCalls = 0;

  private readonly repository: W1Repository;

  constructor(
    row: EntitlementViewRow | null,
    private readonly readFailure?: Error,
    private readonly closeFailure?: Error,
    private readonly createFailure?: Error,
  ) {
    this.repository = {
      transaction: <T>() => Promise.reject<T>(new Error("unused manifest transaction")),
      cleanupExpiredProcessingIdempotency: async () => {},
      readEntitlement: async (subject) => {
        this.readCalls.push(subject);
        if (this.readFailure) throw this.readFailure;
        return row;
      },
      close: async () => {
        this.closeCalls += 1;
        if (this.closeFailure) throw this.closeFailure;
      },
    };
  }

  create(_kind: "checkout"): Promise<W1CheckoutRequestScope>;
  create(_kind: "webhook"): Promise<W1WebhookRequestScope>;
  create(_kind: "claim"): Promise<W1ClaimRequestScope>;
  create(_kind: "redeem"): Promise<W1RedeemRequestScope>;
  create(_kind: "entitlement"): Promise<W1EntitlementRequestScope>;
  async create(
    kind: "checkout" | "webhook" | "claim" | "redeem" | "entitlement",
  ): Promise<W1RequestScope> {
    this.createCalls += 1;
    if (this.createFailure) throw this.createFailure;
    if (kind !== "entitlement") throw new Error("unexpected manifest scope");
    return { repository: this.repository, close: () => this.repository.close() };
  }
}

const clerk = (subject: string | null = "user_manifest"): ClerkAuthPort => ({
  subject: async () => subject,
});

const request = (url = MANIFEST_URL, headers?: HeadersInit) =>
  new Request(url, { headers: { "x-request-id": REQUEST_ID, ...headers } });

describe("W2 unavailable download manifest", () => {
  it("returns only the exact unavailable body for an active entitled subject", async () => {
    const factory = new ManifestScopeFactory(entitlement("active"));
    const response = await createDownloadManifestHandler(factory, clerk())(request());
    const raw = await response.text();

    expect(response.status).toBe(200);
    expect(raw).toBe('{"ready":false}');
    expect(Object.keys(JSON.parse(raw))).toEqual(["ready"]);
    expect(raw).not.toMatch(/url|href|artifact|sha|size|source/i);
    expect(response.headers.get("x-request-id")).toBe(REQUEST_ID);
    expectNoStore(response);
    expect(factory.createCalls).toBe(1);
    expect(factory.readCalls).toEqual(["user_manifest"]);
    expect(factory.closeCalls).toBe(1);
  });

  it("authenticates before opening or reading an entitlement scope", async () => {
    const factory = new ManifestScopeFactory(entitlement("active"));
    const response = await createDownloadManifestHandler(factory, clerk(null))(request());

    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain("ready");
    expectNoStore(response);
    expect(factory.createCalls).toBe(0);
    expect(factory.readCalls).toEqual([]);
    expect(factory.closeCalls).toBe(0);
  });

  it("rejects every malformed selector and caller-supplied subject before lookup", async () => {
    const invalidRequests = [
      request("https://agentkip.test/api/downloads/manifest"),
      request("https://agentkip.test/api/downloads/manifest?platform=macos"),
      request("https://agentkip.test/api/downloads/manifest?architecture=arm64"),
      request(`${MANIFEST_URL}&extra=true`),
      request(`${MANIFEST_URL}&platform=macos`),
      request("https://agentkip.test/api/downloads/manifest?Platform=macos&architecture=arm64"),
      request("https://agentkip.test/api/downloads/manifest?platform=MacOS&architecture=arm64"),
      request("https://agentkip.test/api/downloads/manifest?platform=macos&architecture=ARM64"),
      ...["x-user-id", "x-clerk-user-id", "x-clerk-subject", "x-subject"].map((name) =>
        request(MANIFEST_URL, { [name]: "caller-selected" }),
      ),
    ];

    for (const candidate of invalidRequests) {
      const factory = new ManifestScopeFactory(entitlement("active"));
      const response = await createDownloadManifestHandler(factory, clerk())(candidate);
      expect(response.status).toBe(400);
      expect(await response.text()).not.toContain("ready");
      expectNoStore(response);
      expect(factory.createCalls).toBe(0);
      expect(factory.readCalls).toEqual([]);
      expect(factory.closeCalls).toBe(0);
    }
  });

  it("denies every non-active entitlement without leaking release state", async () => {
    for (const row of [null, entitlement("pending"), entitlement("past_due"), entitlement("revoked")]) {
      const factory = new ManifestScopeFactory(row);
      const response = await createDownloadManifestHandler(factory, clerk())(request());
      const raw = await response.text();
      expect(response.status).toBe(403);
      expect(raw).not.toMatch(/ready|url|href|artifact/i);
      expectNoStore(response);
      expect(factory.readCalls).toEqual(["user_manifest"]);
      expect(factory.closeCalls).toBe(1);
    }
  });

  it("sanitizes scope failures, contains close failures, and never becomes ready", async () => {
    const configuration = new ManifestScopeFactory(
      entitlement("active"),
      undefined,
      undefined,
      new Error("configuration coordinate secret"),
    );
    const unavailableConfiguration = await createDownloadManifestHandler(configuration, clerk())(
      request(),
    );
    const configurationRaw = await unavailableConfiguration.text();
    expect(unavailableConfiguration.status).toBe(503);
    expect(configurationRaw).not.toMatch(/coordinate|secret|ready|url/i);
    expectNoStore(unavailableConfiguration);
    expect(configuration.closeCalls).toBe(0);

    const database = new ManifestScopeFactory(
      entitlement("active"),
      new Error("database coordinate secret"),
    );
    const failed = await createDownloadManifestHandler(database, clerk())(request());
    const failedRaw = await failed.text();
    expect(failed.status).toBe(503);
    expect(failedRaw).not.toMatch(/coordinate|secret|ready|url/i);
    expectNoStore(failed);
    expect(database.closeCalls).toBe(1);

    const closing = new ManifestScopeFactory(
      entitlement("active"),
      undefined,
      new Error("close failure secret"),
    );
    const unavailable = await createDownloadManifestHandler(closing, clerk())(request());
    expect(unavailable.status).toBe(200);
    expect(await unavailable.text()).toBe('{"ready":false}');
    expectNoStore(unavailable);
    expect(closing.closeCalls).toBe(1);
  });
});
