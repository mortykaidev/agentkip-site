import { randomBytes, randomUUID } from "node:crypto";

export const PUBLIC_PRODUCT = "tester" as const;
export const ENTITLEMENT_PRODUCT = "agentkip_first_friend" as const;
export const BOOTSTRAP_CLAIM_REDEEM_ROUTE = "/api/internal/bootstrap-claims/redeem" as const;
export const INTERNAL_REDEEM_PRINCIPAL = "agentkip-control-plane" as const;
export const IDEMPOTENT_ROUTES = ["/api/billing/checkout", "/api/bootstrap-claims", "/api/bootstrap-claims/[claim_id]/revoke", "/api/bootstrap-claims/[claim_id]/reissue"] as const;
export const SUPPORTED_STRIPE_EVENTS = ["customer.subscription.deleted", "customer.subscription.updated", "customer.subscription.created", "invoice.payment_failed", "invoice.paid", "checkout.session.completed"] as const;
export const STRIPE_EVENT_PRECEDENCE = { "customer.subscription.deleted": 100, "customer.subscription.updated": 90, "customer.subscription.created": 80, "invoice.payment_failed": 60, "invoice.paid": 50, "checkout.session.completed": 10 } as const;
export const JSON_BODY_LIMIT_BYTES = 4096;
export const WEBHOOK_BODY_LIMIT_BYTES = 1_048_576;
export const IDEMPOTENCY_TTL_MS = 86_400_000;
export const IDEMPOTENCY_LEASE_MS = 120_000;
export const CLAIM_TTL_MS = 900_000;
export const CLAIM_UNAVAILABLE_PAD_MS = 75;
export const CLAIM_RATE_WINDOW_MS = 900_000;
export const CLAIM_IP_ATTEMPT_LIMIT = 10;
export const CLAIM_SUBJECT_SUCCESS_LIMIT = 3;
export const REVOKE_PRINCIPAL_LIMIT = 10;

export type PublicProduct = typeof PUBLIC_PRODUCT;
export type EntitlementProduct = typeof ENTITLEMENT_PRODUCT;
export type EntitlementStatus = "pending" | "active" | "past_due" | "revoked" | "inactive";
export type ClaimRecoveryReason = "delivery_uncertain";
export type IdempotentRoute = typeof IDEMPOTENT_ROUTES[number];
export type SupportedStripeEventType = typeof SUPPORTED_STRIPE_EVENTS[number];
export type StripeFailureCode = "database_retryable" | "lock_retryable" | "stripe_read_retryable" | "wrong_mode" | "malformed_supported_object" | "price_mismatch" | "product_mismatch" | "unknown_intent" | "unknown_customer" | "identifier_mismatch" | "metadata_mismatch";

export interface W1Clock { now(): Date; }
export interface W1MonotonicClock { now(): number; }
export interface W1Sleeper { sleep(milliseconds: number): Promise<void>; }
export interface W1Random { randomUUID(): string; randomBytes(size: number): Uint8Array; }
export interface W1Logger { webhook(record: { requestId: string; eventId: string; eventType: string; status: string; duplicate: boolean; attemptCount: number; failureCode?: StripeFailureCode }): void; }

export const nodeClock: W1Clock = { now: () => new Date() };
export const nodeMonotonicClock: W1MonotonicClock = { now: () => performance.now() };
export const nodeSleeper: W1Sleeper = { sleep: (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)) };
export const nodeRandom: W1Random = { randomUUID, randomBytes: (size) => randomBytes(size) };
export const noopLogger: W1Logger = { webhook: () => undefined };
