import { createHash, timingSafeEqual } from "node:crypto";
import { w1Error } from "./errors";

const bearerPattern = /^Bearer ([A-Za-z0-9_-]{43,256})$/;
const dummyBearer = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export interface InternalBearerCrypto {
  sha256(value: string): Buffer;
  equal(left: Buffer, right: Buffer): boolean;
}

const nodeCrypto: InternalBearerCrypto = {
  sha256: (value) => createHash("sha256").update(value).digest(),
  equal: timingSafeEqual,
};

const isCanonicalBase64url = (value: string): boolean => {
  const decoded = Buffer.from(value, "base64url");
  try {
    return decoded.length >= 32 && decoded.toString("base64url") === value;
  } finally {
    decoded.fill(0);
  }
};

export function verifyInternalBearer(headers: Headers, configuredToken: string, crypto: InternalBearerCrypto = nodeCrypto): boolean {
  const match = bearerPattern.exec(headers.get("authorization") ?? "");
  const parsed = match?.[1];
  const validSyntax = Boolean(parsed && isCanonicalBase64url(parsed));
  const presented = validSyntax && parsed ? parsed : dummyBearer;
  const left = crypto.sha256(presented);
  const right = crypto.sha256(configuredToken);
  try {
    const equal = crypto.equal(left, right);
    return validSyntax && equal;
  } finally {
    left.fill(0);
    right.fill(0);
  }
}

export function requireInternalBearer(headers: Headers, configuredToken: string): void {
  if (!verifyInternalBearer(headers, configuredToken)) throw w1Error("unauthorized");
}
