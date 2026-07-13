import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/*
  Drizzle schema for the AgentKip site data layer (Neon Postgres).
  `content_sections.value` holds a ContentMap[ContentKey] JSON blob keyed by
  its ContentKey — see src/lib/content-types.ts for the shapes.
  NOTE: no "server-only" import here; drizzle-kit loads this file from the CLI.
*/

export const contentSections = pgTable("content_sections", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stripeEventStatus = pgEnum("stripe_event_status", ["received", "processing", "processed", "ignored", "retryable_failed", "terminal_failed"]);
export const entitlementProduct = pgEnum("entitlement_product", ["agentkip_first_friend"]);
export const entitlementStatus = pgEnum("entitlement_status", ["pending", "active", "past_due", "revoked"]);
export const entitlementSource = pgEnum("entitlement_source", ["stripe_subscription"]);
export const bootstrapClaimStatus = pgEnum("bootstrap_claim_status", ["active", "consumed", "expired", "revoked"]);
export const requestIdempotencyStatus = pgEnum("request_idempotency_status", ["processing", "completed"]);

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const billingCustomers = pgTable("billing_customers", {
  clerkSubject: text("clerk_subject").primaryKey(),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  createdAt,
  updatedAt,
}, (table) => [check("billing_customers_subject_nonempty", sql`length(${table.clerkSubject}) > 0`), check("billing_customers_customer_format", sql`${table.stripeCustomerId} ~ '^cus_'`)]);

export const requestIdempotency = pgTable("request_idempotency", {
  id: uuid("id").primaryKey().defaultRandom(),
  route: text("route").notNull(),
  principal: text("principal").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  requestDigest: text("request_digest").notNull(),
  status: requestIdempotencyStatus("status").notNull().default("processing"),
  responseStatus: integer("response_status"),
  responseMetadata: jsonb("response_metadata"),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt,
  updatedAt,
}, (table) => [
  uniqueIndex("request_idempotency_route_principal_key_unique").on(table.route, table.principal, table.idempotencyKey),
  index("request_idempotency_expiry_idx").on(table.expiresAt),
  index("request_idempotency_processing_lease_idx").on(table.lockedUntil),
  check("request_idempotency_route_check", sql`${table.route} in ('/api/billing/checkout','/api/bootstrap-claims','/api/bootstrap-claims/[claim_id]/revoke','/api/bootstrap-claims/[claim_id]/reissue')`),
  check("request_idempotency_key_check", sql`${table.idempotencyKey} ~ '^[A-Za-z0-9._:-]{8,128}$'`),
  check("request_idempotency_digest_check", sql`${table.requestDigest} ~ '^[0-9a-f]{64}$'`),
  check("request_idempotency_expiry_check", sql`${table.expiresAt} > ${table.createdAt}`),
  check("request_idempotency_state_check", sql`(${table.status} = 'processing' and ${table.responseStatus} is null and ${table.responseMetadata} is null and ${table.lockedUntil} is not null) or (${table.status} = 'completed' and ${table.responseStatus} between 200 and 599 and ${table.responseMetadata} is not null and ${table.lockedUntil} is null)`),
]);

export const billingCheckoutIntents = pgTable("billing_checkout_intents", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestIdempotencyId: uuid("request_idempotency_id").notNull().unique().references(() => requestIdempotency.id, { onDelete: "restrict" }),
  clerkSubject: text("clerk_subject").notNull(),
  stripeCustomerId: text("stripe_customer_id").references(() => billingCustomers.stripeCustomerId, { onDelete: "restrict" }),
  product: entitlementProduct("product").notNull(),
  configuredPriceId: text("configured_price_id").notNull(),
  configuredStripeProductId: text("configured_stripe_product_id").notNull(),
  stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  createdAt,
  updatedAt,
}, (table) => [
  check("checkout_intents_subject_nonempty", sql`length(${table.clerkSubject}) > 0`),
  check("checkout_intents_provider_ids", sql`${table.configuredPriceId} ~ '^price_' and ${table.configuredStripeProductId} ~ '^prod_' and (${table.stripeCustomerId} is null or ${table.stripeCustomerId} ~ '^cus_') and (${table.stripeCheckoutSessionId} is null or ${table.stripeCheckoutSessionId} ~ '^cs_test_') and (${table.stripeSubscriptionId} is null or ${table.stripeSubscriptionId} ~ '^sub_')`),
  check("checkout_intents_dependency_check", sql`(${table.stripeCheckoutSessionId} is null or ${table.stripeCustomerId} is not null) and (${table.stripeSubscriptionId} is null or (${table.stripeCustomerId} is not null and ${table.stripeCheckoutSessionId} is not null))`),
]);

export const stripeEvents = pgTable("stripe_events", {
  stripeEventId: text("stripe_event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  eventCreatedAt: timestamp("event_created_at", { withTimezone: true }).notNull(),
  status: stripeEventStatus("status").notNull().default("received"),
  attemptCount: integer("attempt_count").notNull().default(0),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  failureCode: text("failure_code"),
  createdAt,
  updatedAt,
}, (table) => [
  index("stripe_events_status_retry_updated_idx").on(table.status, table.nextRetryAt, table.updatedAt),
  check("stripe_events_id_check", sql`${table.stripeEventId} ~ '^evt_'`),
  check("stripe_events_type_check", sql`${table.eventType} ~ '^[a-z]+(\\.[a-z_]+)+$' and length(${table.eventType}) <= 128`),
  check("stripe_events_attempt_check", sql`${table.attemptCount} >= 0`),
  check("stripe_events_failure_code_check", sql`${table.failureCode} is null or ${table.failureCode} in ('database_retryable','lock_retryable','stripe_read_retryable','wrong_mode','malformed_supported_object','price_mismatch','product_mismatch','unknown_intent','unknown_customer','identifier_mismatch','metadata_mismatch')`),
  check("stripe_events_state_check", sql`(${table.status} in ('received','processing') and ${table.processedAt} is null and ${table.nextRetryAt} is null and ${table.failureCode} is null) or (${table.status} in ('processed','ignored') and ${table.processedAt} is not null and ${table.nextRetryAt} is null and ${table.failureCode} is null) or (${table.status} = 'retryable_failed' and ${table.processedAt} is null and ${table.nextRetryAt} is not null and ${table.failureCode} in ('database_retryable','lock_retryable','stripe_read_retryable')) or (${table.status} = 'terminal_failed' and ${table.processedAt} is not null and ${table.nextRetryAt} is null and ${table.failureCode} in ('wrong_mode','malformed_supported_object','price_mismatch','product_mismatch','unknown_intent','unknown_customer','identifier_mismatch','metadata_mismatch'))`),
]);

export const entitlements = pgTable("entitlements", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkSubject: text("clerk_subject").notNull().references(() => billingCustomers.clerkSubject, { onDelete: "restrict" }),
  product: entitlementProduct("product").notNull(),
  status: entitlementStatus("status").notNull(),
  source: entitlementSource("source").notNull(),
  stripeCustomerId: text("stripe_customer_id").notNull().references(() => billingCustomers.stripeCustomerId, { onDelete: "restrict" }),
  stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  lastStripeEventId: text("last_stripe_event_id").notNull().references(() => stripeEvents.stripeEventId, { onDelete: "restrict" }),
  lastEventCreatedAt: timestamp("last_event_created_at", { withTimezone: true }).notNull(),
  lastEventPrecedence: integer("last_event_precedence").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt,
  updatedAt,
}, (table) => [
  uniqueIndex("entitlements_subject_product_unique").on(table.clerkSubject, table.product),
  uniqueIndex("entitlements_active_subject_product_unique").on(table.clerkSubject, table.product).where(sql`${table.status} = 'active'`),
  check("entitlements_status_dates_check", sql`(${table.status} = 'active' and ${table.grantedAt} is not null and ${table.revokedAt} is null) or (${table.status} = 'revoked' and ${table.revokedAt} is not null) or (${table.status} in ('pending','past_due') and ${table.revokedAt} is null)`),
]);

export const entitlementTransitions = pgTable("entitlement_transitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  entitlementId: uuid("entitlement_id").notNull().references(() => entitlements.id, { onDelete: "restrict" }),
  stripeEventId: text("stripe_event_id").notNull().unique().references(() => stripeEvents.stripeEventId, { onDelete: "restrict" }),
  fromStatus: entitlementStatus("from_status"),
  toStatus: entitlementStatus("to_status").notNull(),
  eventCreatedAt: timestamp("event_created_at", { withTimezone: true }).notNull(),
  eventPrecedence: integer("event_precedence").notNull(),
  reasonCode: text("reason_code").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("entitlement_transitions_reason_check", sql`${table.reasonCode} in ('checkout_completed','subscription_created','subscription_updated','subscription_deleted','invoice_paid','invoice_payment_failed')`)]);

export const bootstrapClaims = pgTable("bootstrap_claims", {
  id: uuid("id").primaryKey(),
  entitlementId: uuid("entitlement_id").notNull().references(() => entitlements.id, { onDelete: "restrict" }),
  clerkSubject: text("clerk_subject").notNull(),
  product: entitlementProduct("product").notNull(),
  claimHash: text("claim_hash").notNull().unique(),
  pepperVersion: smallint("pepper_version").notNull(),
  status: bootstrapClaimStatus("status").notNull().default("active"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  redemptionId: uuid("redemption_id").unique(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokeReason: text("revoke_reason"),
  createdAt,
  updatedAt,
}, (table) => [
  uniqueIndex("bootstrap_claims_active_subject_entitlement_unique").on(table.clerkSubject, table.entitlementId).where(sql`${table.status} = 'active'`),
  check("bootstrap_claims_hash_check", sql`${table.claimHash} ~ '^[0-9a-f]{64}$'`),
  check("bootstrap_claims_pepper_check", sql`${table.pepperVersion} > 0`),
  check("bootstrap_claims_lifecycle_check", sql`(${table.status} = 'consumed' and ${table.consumedAt} is not null and ${table.redemptionId} is not null and ${table.revokedAt} is null) or (${table.status} in ('active','expired') and ${table.redemptionId} is null and ${table.consumedAt} is null and ${table.revokedAt} is null) or (${table.status} = 'revoked' and ${table.redemptionId} is null and ${table.revokedAt} is not null and ${table.revokeReason} in ('delivery_uncertain','entitlement_inactive'))`),
  check("bootstrap_claims_expiry_check", sql`${table.expiresAt} > ${table.createdAt}`),
]);

export const bootstrapClaimAttempts = pgTable("bootstrap_claim_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceIpHash: text("source_ip_hash").notNull(),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("bootstrap_claim_attempts_ip_created_idx").on(table.sourceIpHash, table.createdAt), check("bootstrap_claim_attempts_ip_hash_check", sql`${table.sourceIpHash} ~ '^[0-9a-f]{64}$'`), check("bootstrap_claim_attempts_action_check", sql`${table.action} in ('issue','reissue')`)]);
