type Env = Record<string, string | undefined>;

export interface W1DatabaseConfig {
  databaseUrl: string;
}

export interface W1StripeAuthorityConfig extends W1DatabaseConfig {
  stripeSecretKey: string;
  priceId: string;
  productId: string;
}

export interface W1CheckoutConfig extends W1StripeAuthorityConfig {
  siteOrigin: string;
  successUrl: string;
  cancelUrl: string;
}

export interface W1WebhookConfig extends W1StripeAuthorityConfig {
  stripeWebhookSecret: string;
}

export interface W1ClaimConfig extends W1DatabaseConfig {
  claimPepper: string;
  rateLimitPepper: string;
}

export interface W1RedeemConfig extends W1ClaimConfig {
  internalBearer: string;
}

const base64url = /^[A-Za-z0-9_-]{43,256}$/;
const unavailable: () => never = () => {
  throw new Error("configuration unavailable");
};
const exactRequired = (env: Env, key: string): string => {
  const value = env[key];
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) unavailable();
  return value;
};

const canonicalSecret = (env: Env, key: string): string => {
  const value = exactRequired(env, key);
  if (!base64url.test(value)) unavailable();
  const decoded = Buffer.from(value, "base64url");
  try {
    if (decoded.length < 32 || decoded.length > 192 || decoded.toString("base64url") !== value) unavailable();
    return value;
  } finally {
    decoded.fill(0);
  }
};

const port = (value: string) => /^[1-9][0-9]{0,4}$/.test(value) && Number(value) <= 65535;
const authorityPort = (authority: string): void => {
  const hostPort = authority.slice(authority.lastIndexOf("@") + 1);
  if (hostPort.startsWith("[")) {
    const close = hostPort.indexOf("]");
    if (close < 1 || hostPort.indexOf("]", close + 1) !== -1) unavailable();
    const suffix = hostPort.slice(close + 1);
    if (suffix && (!suffix.startsWith(":") || !port(suffix.slice(1)))) unavailable();
    return;
  }
  const colons = hostPort.split(":").length - 1;
  if (colons > 1) unavailable();
  if (colons === 1 && !port(hostPort.slice(hostPort.indexOf(":") + 1))) unavailable();
};
const database = (env: Env): W1DatabaseConfig => {
  const raw = exactRequired(env, "DATABASE_URL");
  if (Buffer.byteLength(raw, "utf8") > 4096 || /\s/u.test(raw) || /[\u0000-\u001f\u007f]/u.test(raw) || !/^postgres(?:ql)?:\/\//.test(raw) || raw.includes("#")) unavailable();
  const authority = raw.slice(raw.indexOf("://") + 3).split(/[/?#]/, 1)[0]!;
  authorityPort(authority);
  let url: URL;
  try { url = new URL(raw); } catch { return unavailable(); }
  if ((url.protocol !== "postgres:" && url.protocol !== "postgresql:") || !url.hostname) unavailable();
  return { databaseUrl: raw };
};

const configuredId = (env: Env, key: string, prefix: "price_" | "prod_"): string => {
  const value = exactRequired(env, key);
  if (!new RegExp(`^${prefix}[A-Za-z0-9]{8,64}$`).test(value)) unavailable();
  return value;
};

const stripeKey = (env: Env): string => {
  const value = exactRequired(env, "STRIPE_SECRET_KEY");
  if (!/^sk_test_[A-Za-z0-9]{24,128}$/.test(value)) unavailable();
  return value;
};

const webhookSecret = (env: Env): string => {
  const value = exactRequired(env, "STRIPE_WEBHOOK_SECRET");
  if (!/^whsec_[A-Za-z0-9]{24,128}$/.test(value)) unavailable();
  return value;
};

const origin = (env: Env): string => {
  const raw = exactRequired(env, "NEXT_PUBLIC_SITE_URL");
  if (Buffer.byteLength(raw, "utf8") > 2048 || /\s/u.test(raw) || /[\u0000-\u001f\u007f]/u.test(raw)) unavailable();
  const match = /^(https?):\/\/([^/?#]+)(\/?)$/.exec(raw);
  if (!match) unavailable();
  const scheme = match[1]!;
  const authority = match[2]!;
  if (authority.includes("@")) unavailable();
  let rawHost: string;
  if (authority.startsWith("[")) {
    const close = authority.indexOf("]");
    if (close < 1 || authority.indexOf("]", close + 1) !== -1) unavailable();
    rawHost = authority.slice(0, close + 1);
    const suffix = authority.slice(close + 1);
    if (suffix && (!suffix.startsWith(":") || !port(suffix.slice(1)))) unavailable();
  } else {
    if (authority.split(":").length > 2) unavailable();
    const separator = authority.indexOf(":");
    rawHost = separator === -1 ? authority : authority.slice(0, separator);
    if (!rawHost || (separator !== -1 && !port(authority.slice(separator + 1)))) unavailable();
  }
  let url: URL;
  try { url = new URL(raw); } catch { return unavailable(); }
  if (url.username || url.password || url.pathname !== "/") unavailable();
  const h = url.hostname.toLowerCase();
  const noFinalDot = h.endsWith(".") ? h.slice(0, -1) : h;
  const localhostName = noFinalDot === "localhost" || noFinalDot.endsWith(".localhost");
  const ipv4Loopback = /^127(?:\.[0-9]{1,3}){3}$/.test(h);
  const ipv6Loopback = h === "[::1]";
  const mapped = /^\[::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})\]$/.exec(h);
  const mappedDotted = /^\[::ffff:(127)(?:\.[0-9]{1,3}){3}\]$/.test(h);
  const mappedLoopback = mapped !== null ? (Number.parseInt(mapped[1]!, 16) >>> 8) === 0x7f : mappedDotted;
  const recognizableLoopback = localhostName || ipv4Loopback || ipv6Loopback || mappedLoopback;
  const exactLoopback = rawHost === "localhost" || rawHost === "127.0.0.1" || rawHost === "[::1]";
  if (exactLoopback) {
    if (env.NODE_ENV === "production") unavailable();
  } else {
    if (recognizableLoopback || scheme !== "https") unavailable();
  }
  return url.origin;
};

const stripeAuthority = (env: Env) => ({
  ...database(env),
  stripeSecretKey: stripeKey(env),
  priceId: configuredId(env, "STRIPE_TESTER_PRICE_ID", "price_"),
  productId: configuredId(env, "STRIPE_TESTER_PRODUCT_ID", "prod_"),
});

export const loadEntitlementConfig = (env: Env = process.env): W1DatabaseConfig => database(env);

export const loadCheckoutConfig = (env: Env = process.env): W1CheckoutConfig => {
  const siteOrigin = origin(env);
  return {
    ...stripeAuthority(env),
    siteOrigin,
    successUrl: `${siteOrigin}/account?checkout=success`,
    cancelUrl: `${siteOrigin}/account?checkout=cancelled`,
  };
};

export const loadWebhookConfig = (env: Env = process.env): W1WebhookConfig => ({
  ...stripeAuthority(env),
  stripeWebhookSecret: webhookSecret(env),
});

export const loadClaimConfig = (env: Env = process.env): W1ClaimConfig => {
  const claimPepper = canonicalSecret(env, "BOOTSTRAP_CLAIM_PEPPER_V1");
  const rateLimitPepper = canonicalSecret(env, "BOOTSTRAP_RATE_LIMIT_PEPPER_V1");
  if (claimPepper === rateLimitPepper) unavailable();
  return { ...database(env), claimPepper, rateLimitPepper };
};

export const loadRedeemConfig = (env: Env = process.env): W1RedeemConfig => {
  const config = loadClaimConfig(env);
  const internalBearer = canonicalSecret(env, "INTERNAL_BOOTSTRAP_CLAIM_REDEEM_TOKEN");
  if (new Set([config.claimPepper, config.rateLimitPepper, internalBearer]).size !== 3) unavailable();
  return { ...config, internalBearer };
};
