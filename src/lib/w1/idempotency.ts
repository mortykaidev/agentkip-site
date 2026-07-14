import { IDEMPOTENCY_LEASE_MS, IDEMPOTENCY_TTL_MS, type IdempotentRoute } from "./constants";
import { w1Error } from "./errors";

export type CheckoutRoute = "/api/billing/checkout";
export type ClaimIssueRoute = "/api/bootstrap-claims" | "/api/bootstrap-claims/[claim_id]/reissue";
export type ClaimRevokeRoute = "/api/bootstrap-claims/[claim_id]/revoke";

export interface CheckoutMetadata {
  checkoutUrl: string;
  expiresAt: string;
}

export interface ClaimRecoveryMetadata {
  claim_id: string;
  status: "active";
  expires_at: string;
  replayable: false;
  revoke_path: string;
  reissue_path: string;
}

export interface ClaimRevokeMetadata {
  claim_id: string;
  status: "revoked" | "expired";
  expires_at: string;
  replayable: false;
  reissue_path: string;
}

export type IdempotencyMetadata = CheckoutMetadata | ClaimRecoveryMetadata | ClaimRevokeMetadata;
export type MetadataForRoute<R extends IdempotentRoute> =
  R extends CheckoutRoute ? CheckoutMetadata :
  R extends ClaimIssueRoute ? ClaimRecoveryMetadata :
  R extends ClaimRevokeRoute ? ClaimRevokeMetadata :
  never;

export interface IdempotencyRecord<R extends IdempotentRoute = IdempotentRoute> {
  id: string;
  route: R;
  principal: string;
  idempotencyKey: string;
  requestDigest: string;
  status: "processing" | "completed";
  responseStatus: number | null;
  responseMetadata: MetadataForRoute<R> | null;
  lockedUntil: Date | null;
  expiresAt: Date;
}

export type IdempotencyReservation<R extends IdempotentRoute = IdempotentRoute> =
  Omit<IdempotencyRecord<R>, "id" | "status" | "responseStatus" | "responseMetadata">;
export type IdempotencyDecision<R extends IdempotentRoute = IdempotentRoute> =
  | { kind: "reserve" | "reacquire" }
  | { kind: "completed"; record: IdempotencyRecord<R> & { responseMetadata: MetadataForRoute<R> } };

export const validateIdempotencyKey = (key: string | null) => {
  if (!key || !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) throw w1Error("invalid_idempotency_key");
  return key;
};

export function decideIdempotency<R extends IdempotentRoute>(record: IdempotencyRecord<R> | null, digest: string, now: Date): IdempotencyDecision<R> {
  if (!record) return { kind: "reserve" };
  if (record.requestDigest !== digest) throw w1Error("idempotency_conflict");
  if (record.status === "completed") {
    if (record.responseMetadata === null || record.responseStatus !== completionStatus(record.route)) throw new TypeError("invalid completed idempotency record");
    const responseMetadata = validateResponseMetadata(record.route, record.responseMetadata);
    return { kind: "completed", record: { ...record, responseMetadata } };
  }
  if (!record.lockedUntil || record.lockedUntil.getTime() > now.getTime()) throw w1Error("request_in_progress", 2);
  return { kind: "reacquire" };
}

const canonicalUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const canonicalIso = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const canonicalDigest = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
const ownValue = (value: object, key: string): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) throw new TypeError("invalid response metadata");
  return descriptor.value;
};
const exactKeys = (value: object, keys: readonly string[]) => {
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.length || actual.some((key) => typeof key !== "string") || keys.some((key) => !actual.includes(key))) throw new TypeError("invalid response metadata");
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) throw new TypeError("invalid response metadata");
  }
};
const metadataObject = (metadata: unknown): object => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata) || Object.getPrototypeOf(metadata) !== Object.prototype) throw new TypeError("invalid response metadata");
  return metadata;
};
const canonicalCheckoutUrl = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return value.startsWith("https://checkout.stripe.com/") && url.protocol === "https:" && url.origin === "https://checkout.stripe.com" && url.hostname === "checkout.stripe.com" && url.host === "checkout.stripe.com" && url.port === "" && url.username === "" && url.password === "" && url.href === value && url.pathname.startsWith("/");
  } catch {
    return false;
  }
};
const claimFields = (value: object, issueRoute: boolean): ClaimRecoveryMetadata | ClaimRevokeMetadata => {
  const claimId = ownValue(value, "claim_id");
  const status = ownValue(value, "status");
  const expiresAt = ownValue(value, "expires_at");
  const replayable = ownValue(value, "replayable");
  const reissuePath = ownValue(value, "reissue_path");
  if (typeof claimId !== "string" || !canonicalUuid.test(claimId) || !canonicalIso(expiresAt) || replayable !== false || reissuePath !== `/api/bootstrap-claims/${claimId}/reissue`) throw new TypeError("invalid response metadata");
  if (issueRoute) {
    if (status !== "active") throw new TypeError("invalid response metadata");
    const revokePath = ownValue(value, "revoke_path");
    if (revokePath !== `/api/bootstrap-claims/${claimId}/revoke`) throw new TypeError("invalid response metadata");
    return { claim_id: claimId, status: "active", expires_at: expiresAt, replayable: false, revoke_path: revokePath, reissue_path: reissuePath };
  }
  if (status !== "revoked" && status !== "expired") throw new TypeError("invalid response metadata");
  return { claim_id: claimId, status, expires_at: expiresAt, replayable: false, reissue_path: reissuePath };
};

export const completionStatus = (route: IdempotentRoute): number => route === "/api/bootstrap-claims" || route === "/api/bootstrap-claims/[claim_id]/reissue" ? 201 : 200;

export function validateResponseMetadata(route: CheckoutRoute, metadata: unknown): CheckoutMetadata;
export function validateResponseMetadata(route: ClaimIssueRoute, metadata: unknown): ClaimRecoveryMetadata;
export function validateResponseMetadata(route: ClaimRevokeRoute, metadata: unknown): ClaimRevokeMetadata;
export function validateResponseMetadata<R extends IdempotentRoute>(route: R, metadata: unknown): MetadataForRoute<R>;
export function validateResponseMetadata(route: IdempotentRoute, metadata: unknown): IdempotencyMetadata {
  const value = metadataObject(metadata);
  if (route === "/api/billing/checkout") {
    exactKeys(value, ["checkoutUrl", "expiresAt"]);
    const checkoutUrl = ownValue(value, "checkoutUrl");
    const expiresAt = ownValue(value, "expiresAt");
    if (!canonicalCheckoutUrl(checkoutUrl) || !canonicalIso(expiresAt)) throw new TypeError("invalid response metadata");
    return { checkoutUrl, expiresAt };
  }
  if (route === "/api/bootstrap-claims/[claim_id]/revoke") {
    exactKeys(value, ["claim_id", "expires_at", "reissue_path", "replayable", "status"]);
    const revokeMetadata = claimFields(value, false);
    if (revokeMetadata.status === "active") throw new TypeError("invalid response metadata");
    return revokeMetadata;
  }
  exactKeys(value, ["claim_id", "expires_at", "reissue_path", "replayable", "revoke_path", "status"]);
  const issueMetadata = claimFields(value, true);
  if (issueMetadata.status !== "active") throw new TypeError("invalid response metadata");
  return issueMetadata;
}

const idempotencyFields = ["id", "route", "principal", "idempotencyKey", "requestDigest", "status", "responseStatus", "responseMetadata", "lockedUntil", "expiresAt"] as const;
const exactRowValues = (value: unknown): Map<(typeof idempotencyFields)[number], unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError("invalid idempotency row");
  const keys = Reflect.ownKeys(value);
  if (keys.length !== idempotencyFields.length || keys.some((key) => typeof key !== "string") || idempotencyFields.some((key) => !keys.includes(key))) throw new TypeError("invalid idempotency row");
  const values = new Map<(typeof idempotencyFields)[number], unknown>();
  for (const key of idempotencyFields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) throw new TypeError("invalid idempotency row");
    values.set(key, descriptor.value);
  }
  return values;
};
const epochDate = (value: unknown): Date | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

/** Decodes untrusted driver JSON into a new route-bound idempotency record. */
export function decodeIdempotencyRecord<R extends IdempotentRoute>(raw: unknown, expected: { route: R; principal: string; idempotencyKey: string }): IdempotencyRecord<R> {
  const row = exactRowValues(raw);
  const id = row.get("id");
  const route = row.get("route");
  const principal = row.get("principal");
  const idempotencyKey = row.get("idempotencyKey");
  const requestDigest = row.get("requestDigest");
  const status = row.get("status");
  const responseStatus = row.get("responseStatus");
  const responseMetadata = row.get("responseMetadata");
  const lockedUntil = row.get("lockedUntil");
  const expiresAt = epochDate(row.get("expiresAt"));
  if (typeof id !== "string" || typeof route !== "string" || typeof principal !== "string" || typeof idempotencyKey !== "string" || !canonicalUuid.test(id) || route !== expected.route || principal !== expected.principal || idempotencyKey !== expected.idempotencyKey || !validateIdempotencyKey(idempotencyKey) || !canonicalDigest(requestDigest) || !expiresAt) throw new TypeError("invalid idempotency row");
  if (status === "processing") {
    const lock = epochDate(lockedUntil);
    if (responseStatus !== null || responseMetadata !== null || !lock) throw new TypeError("invalid idempotency row");
    return { id, route: expected.route, principal: expected.principal, idempotencyKey: expected.idempotencyKey, requestDigest, status, responseStatus: null, responseMetadata: null, lockedUntil: new Date(lock.getTime()), expiresAt: new Date(expiresAt.getTime()) };
  }
  if (status !== "completed" || lockedUntil !== null || responseStatus !== completionStatus(expected.route) || responseMetadata === null) throw new TypeError("invalid idempotency row");
  const metadata = validateResponseMetadata(expected.route, responseMetadata);
  return { id, route: expected.route, principal: expected.principal, idempotencyKey: expected.idempotencyKey, requestDigest, status, responseStatus, responseMetadata: metadata, lockedUntil: null, expiresAt: new Date(expiresAt.getTime()) };
}

export const idempotencyWindow = (now: Date) => ({
  lockedUntil: new Date(now.getTime() + IDEMPOTENCY_LEASE_MS),
  expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
});
