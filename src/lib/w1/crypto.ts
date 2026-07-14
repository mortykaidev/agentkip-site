import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { W1Random } from "./constants";
const hex = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const codePointOrder = (left: string, right: string) => {
  const a = Array.from(left); const b = Array.from(right);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    const delta = a[index].codePointAt(0)! - b[index].codePointAt(0)!;
    if (delta !== 0) return delta;
  }
  return a.length - b.length;
};
export function canonicalJson(value: unknown): string {
  const stack = new Set<object>();
  const encode = (current: unknown): string => {
    if (current === null || typeof current === "string" || typeof current === "boolean") return JSON.stringify(current);
    if (typeof current === "number") {
      if (!Number.isFinite(current)) throw new TypeError("unsupported value");
      return JSON.stringify(current);
    }
    if (typeof current !== "object") throw new TypeError("unsupported value");
    if (stack.has(current)) throw new TypeError("unsupported value");
    stack.add(current);
    try {
      if (Array.isArray(current)) {
        if (Object.getOwnPropertySymbols(current).length !== 0) throw new TypeError("unsupported value");
        const values: string[] = [];
        for (let index = 0; index < current.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(current, String(index));
          if (!descriptor || !("value" in descriptor)) throw new TypeError("unsupported value");
          values.push(encode(descriptor.value));
        }
        return "[" + values.join(",") + "]";
      }
      const prototype = Object.getPrototypeOf(current);
      if (prototype !== Object.prototype && prototype !== null || Object.getOwnPropertySymbols(current).length !== 0) throw new TypeError("unsupported value");
      return "{" + Object.keys(current).sort(codePointOrder).map((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (!descriptor || !("value" in descriptor)) throw new TypeError("unsupported value");
        return JSON.stringify(key) + ":" + encode(descriptor.value);
      }).join(",") + "}";
    } finally {
      stack.delete(current);
    }
  };
  return encode(value);
}
export const digestRequest = (method: string, pathname: string, body: unknown) => hex("w1\n" + method.toUpperCase() + "\n" + pathname + "\n" + canonicalJson(body));
export const deriveStripeIdempotencyKey = (kind: "customer" | "checkout", value: string) => kind === "customer" ? "agentkip:w1:customer:" + hex(value) : "agentkip:w1:checkout:" + value;
const claimPattern = /^akc1\.([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function generateClaim(random: W1Random) {
  const id = random.randomUUID().toLowerCase();
  if (!uuid.test(id)) throw new TypeError("invalid random UUID");
  const idBytes = Buffer.from(id.replaceAll("-", ""), "hex");
  const randomBytes = random.randomBytes(32);
  const secret = Buffer.from(randomBytes);
  try {
    if (secret.length !== 32) throw new TypeError("invalid random bytes");
    return { id, claim: `akc1.${idBytes.toString("base64url")}.${secret.toString("base64url")}` };
  } finally {
    idBytes.fill(0);
    secret.fill(0);
    randomBytes.fill(0);
  }
}
export function parseClaim(claim: string) {
  const match = claimPattern.exec(claim);
  if (!match) return null;
  const bytes = Buffer.from(match[1], "base64url");
  const secret = Buffer.from(match[2], "base64url");
  try {
    if (bytes.length !== 16 || secret.length !== 32 || bytes.toString("base64url") !== match[1] || secret.toString("base64url") !== match[2]) return null;
    const value = bytes.toString("hex");
    const id = `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
    return uuid.test(id) ? { id, claim } : null;
  } finally {
    bytes.fill(0);
    secret.fill(0);
  }
}
export const hashClaim = (claim: string, pepper: string) => createHmac("sha256", pepper).update(claim, "ascii").digest("hex");
export const hashSourceIp = (address: string, pepper: string) => createHmac("sha256", pepper).update(address, "utf8").digest("hex");
export function constantTimeDigestEqual(presented: string, configured: string) { const left = createHash("sha256").update(presented).digest(); const right = createHash("sha256").update(configured).digest(); try { return timingSafeEqual(left, right); } finally { left.fill(0); right.fill(0); } }
const validPort = (value: string | undefined) => value === undefined || (/^[1-9][0-9]{0,4}$/.test(value) && Number(value) <= 65535);
export function normalizeSourceIp(value: string) {
  const trimmed = value.trim();
  let address = trimmed;
  if (trimmed.startsWith("[")) {
    const match = /^\[([^\[\]]+)\](?::([1-9][0-9]{0,4}))?$/.exec(trimmed);
    if (!match || !validPort(match[2])) return "unknown";
    address = match[1]!;
  } else {
    if (trimmed.includes("[") || trimmed.includes("]") || trimmed.includes(",")) return "unknown";
    const match = /^([0-9]{1,3}(?:\.[0-9]{1,3}){3}):([1-9][0-9]{0,4})$/.exec(trimmed);
    if (match) {
      if (!validPort(match[2])) return "unknown";
      address = match[1]!;
    }
  }
  if (isIP(address) === 4) return address.split(".").map((part) => String(Number(part))).join(".");
  if (isIP(address) === 6) return new URL("http://[" + address + "]").hostname.slice(1, -1).toLowerCase();
  return "unknown";
}
export const sourceIpBucketFromRequest = (headers: Headers, vercel = process.env.VERCEL === "1") => {
  if (!vercel) return "unknown";
  const forwarded = headers.get("x-forwarded-for");
  return forwarded === null ? "unknown" : normalizeSourceIp(forwarded.split(",", 1)[0]!);
};
