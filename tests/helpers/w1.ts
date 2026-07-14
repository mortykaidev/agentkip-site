import { expect } from "vitest";
import type { W1Clock, W1MonotonicClock, W1Random, W1Sleeper } from "@/lib/w1/constants";
import type { W1Repository, W1RepositoryTx } from "@/lib/w1/repository";
import type { W1CheckoutRequestScope, W1ClaimRequestScope, W1EntitlementRequestScope, W1RedeemRequestScope, W1RequestScope, W1RequestScopeFactory, W1WebhookRequestScope } from "@/lib/w1/services";
export const fixedClock = (iso = "2026-07-13T00:00:00.000Z"): W1Clock => ({ now: () => new Date(iso) });
export const fixedMonotonic = (): W1MonotonicClock => ({ now: () => 0 });
export const noWaitSleeper = (): W1Sleeper & { calls: number[] } => { const calls: number[] = []; return { calls, sleep: async (value) => { calls.push(value); } }; };
export const fixedRandom = (): W1Random => ({ randomUUID: () => "10000000-0000-4000-8000-000000000001", randomBytes: (size) => new Uint8Array(size).fill(7) });
export const expectNoStore = (response: Response) => expect(response.headers.get("cache-control")).toBe("no-store");

class ThrowingCloseEntitlementFactory implements W1RequestScopeFactory {
  closeCalls = 0;
  private readonly repository: W1Repository;
  constructor(readFailure?: Error) {
    this.repository = {
      transaction: async <T>(_work: (tx: W1RepositoryTx) => Promise<T>) => { throw new Error("unused test transaction"); },
      cleanupExpiredProcessingIdempotency: async () => {},
      readEntitlement: async () => { if (readFailure) throw readFailure; return null; },
      close: async () => { this.closeCalls += 1; throw new Error("close failure secret"); },
    };
  }
  create(_kind: "checkout"): Promise<W1CheckoutRequestScope>;
  create(_kind: "webhook"): Promise<W1WebhookRequestScope>;
  create(_kind: "claim"): Promise<W1ClaimRequestScope>;
  create(_kind: "redeem"): Promise<W1RedeemRequestScope>;
  create(_kind: "entitlement"): Promise<W1EntitlementRequestScope>;
  async create(kind: "entitlement" | "claim" | "redeem" | "checkout" | "webhook"): Promise<W1RequestScope> {
    if (kind !== "entitlement") throw new Error("unexpected test scope");
    return { repository: this.repository, close: () => this.repository.close() };
  }
}

export const throwingCloseEntitlementFactory = (readFailure?: Error): W1RequestScopeFactory & { closeCalls: number } => new ThrowingCloseEntitlementFactory(readFailure);
