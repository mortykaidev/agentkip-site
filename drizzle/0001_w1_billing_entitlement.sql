CREATE TYPE "public"."bootstrap_claim_status" AS ENUM('active', 'consumed', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."entitlement_product" AS ENUM('agentkip_first_friend');--> statement-breakpoint
CREATE TYPE "public"."entitlement_source" AS ENUM('stripe_subscription');--> statement-breakpoint
CREATE TYPE "public"."entitlement_status" AS ENUM('pending', 'active', 'past_due', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."request_idempotency_status" AS ENUM('processing', 'completed');--> statement-breakpoint
CREATE TYPE "public"."stripe_event_status" AS ENUM('received', 'processing', 'processed', 'ignored', 'retryable_failed', 'terminal_failed');--> statement-breakpoint
CREATE TABLE "billing_checkout_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_idempotency_id" uuid NOT NULL,
	"clerk_subject" text NOT NULL,
	"stripe_customer_id" text,
	"product" "entitlement_product" NOT NULL,
	"configured_price_id" text NOT NULL,
	"configured_stripe_product_id" text NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_checkout_intents_request_idempotency_id_unique" UNIQUE("request_idempotency_id"),
	CONSTRAINT "billing_checkout_intents_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id"),
	CONSTRAINT "billing_checkout_intents_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id"),
	CONSTRAINT "checkout_intents_subject_nonempty" CHECK (length("billing_checkout_intents"."clerk_subject") > 0),
	CONSTRAINT "checkout_intents_provider_ids" CHECK ("billing_checkout_intents"."configured_price_id" ~ '^price_' and "billing_checkout_intents"."configured_stripe_product_id" ~ '^prod_' and ("billing_checkout_intents"."stripe_customer_id" is null or "billing_checkout_intents"."stripe_customer_id" ~ '^cus_') and ("billing_checkout_intents"."stripe_checkout_session_id" is null or "billing_checkout_intents"."stripe_checkout_session_id" ~ '^cs_test_') and ("billing_checkout_intents"."stripe_subscription_id" is null or "billing_checkout_intents"."stripe_subscription_id" ~ '^sub_')),
	CONSTRAINT "checkout_intents_dependency_check" CHECK (("billing_checkout_intents"."stripe_checkout_session_id" is null or "billing_checkout_intents"."stripe_customer_id" is not null) and ("billing_checkout_intents"."stripe_subscription_id" is null or ("billing_checkout_intents"."stripe_customer_id" is not null and "billing_checkout_intents"."stripe_checkout_session_id" is not null)))
);
--> statement-breakpoint
CREATE TABLE "billing_customers" (
	"clerk_subject" text PRIMARY KEY NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_customers_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "billing_customers_subject_nonempty" CHECK (length("billing_customers"."clerk_subject") > 0),
	CONSTRAINT "billing_customers_customer_format" CHECK ("billing_customers"."stripe_customer_id" ~ '^cus_')
);
--> statement-breakpoint
CREATE TABLE "bootstrap_claim_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_ip_hash" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bootstrap_claim_attempts_ip_hash_check" CHECK ("bootstrap_claim_attempts"."source_ip_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "bootstrap_claim_attempts_action_check" CHECK ("bootstrap_claim_attempts"."action" in ('issue','reissue'))
);
--> statement-breakpoint
CREATE TABLE "bootstrap_claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"entitlement_id" uuid NOT NULL,
	"clerk_subject" text NOT NULL,
	"product" "entitlement_product" NOT NULL,
	"claim_hash" text NOT NULL,
	"pepper_version" smallint NOT NULL,
	"status" "bootstrap_claim_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"redemption_id" uuid,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bootstrap_claims_claim_hash_unique" UNIQUE("claim_hash"),
	CONSTRAINT "bootstrap_claims_redemption_id_unique" UNIQUE("redemption_id"),
	CONSTRAINT "bootstrap_claims_hash_check" CHECK ("bootstrap_claims"."claim_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "bootstrap_claims_pepper_check" CHECK ("bootstrap_claims"."pepper_version" > 0),
	CONSTRAINT "bootstrap_claims_lifecycle_check" CHECK (("bootstrap_claims"."status" = 'consumed' and "bootstrap_claims"."consumed_at" is not null and "bootstrap_claims"."redemption_id" is not null and "bootstrap_claims"."revoked_at" is null) or ("bootstrap_claims"."status" in ('active','expired') and "bootstrap_claims"."redemption_id" is null and "bootstrap_claims"."consumed_at" is null and "bootstrap_claims"."revoked_at" is null) or ("bootstrap_claims"."status" = 'revoked' and "bootstrap_claims"."redemption_id" is null and "bootstrap_claims"."revoked_at" is not null and "bootstrap_claims"."revoke_reason" in ('delivery_uncertain','entitlement_inactive'))),
	CONSTRAINT "bootstrap_claims_expiry_check" CHECK ("bootstrap_claims"."expires_at" > "bootstrap_claims"."created_at")
);
--> statement-breakpoint
CREATE TABLE "entitlement_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entitlement_id" uuid NOT NULL,
	"stripe_event_id" text NOT NULL,
	"from_status" "entitlement_status",
	"to_status" "entitlement_status" NOT NULL,
	"event_created_at" timestamp with time zone NOT NULL,
	"event_precedence" integer NOT NULL,
	"reason_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlement_transitions_stripe_event_id_unique" UNIQUE("stripe_event_id"),
	CONSTRAINT "entitlement_transitions_reason_check" CHECK ("entitlement_transitions"."reason_code" in ('checkout_completed','subscription_created','subscription_updated','subscription_deleted','invoice_paid','invoice_payment_failed'))
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_subject" text NOT NULL,
	"product" "entitlement_product" NOT NULL,
	"status" "entitlement_status" NOT NULL,
	"source" "entitlement_source" NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_subscription_id" text NOT NULL,
	"last_stripe_event_id" text NOT NULL,
	"last_event_created_at" timestamp with time zone NOT NULL,
	"last_event_precedence" integer NOT NULL,
	"granted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlements_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id"),
	CONSTRAINT "entitlements_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id"),
	CONSTRAINT "entitlements_status_dates_check" CHECK (("entitlements"."status" = 'active' and "entitlements"."granted_at" is not null and "entitlements"."revoked_at" is null) or ("entitlements"."status" = 'revoked' and "entitlements"."revoked_at" is not null) or ("entitlements"."status" in ('pending','past_due') and "entitlements"."revoked_at" is null))
);
--> statement-breakpoint
CREATE TABLE "request_idempotency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route" text NOT NULL,
	"principal" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_digest" text NOT NULL,
	"status" "request_idempotency_status" DEFAULT 'processing' NOT NULL,
	"response_status" integer,
	"response_metadata" jsonb,
	"locked_until" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "request_idempotency_route_check" CHECK ("request_idempotency"."route" in ('/api/billing/checkout','/api/bootstrap-claims','/api/bootstrap-claims/[claim_id]/revoke','/api/bootstrap-claims/[claim_id]/reissue')),
	CONSTRAINT "request_idempotency_key_check" CHECK ("request_idempotency"."idempotency_key" ~ '^[A-Za-z0-9._:-]{8,128}$'),
	CONSTRAINT "request_idempotency_digest_check" CHECK ("request_idempotency"."request_digest" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "request_idempotency_expiry_check" CHECK ("request_idempotency"."expires_at" > "request_idempotency"."created_at"),
	CONSTRAINT "request_idempotency_state_check" CHECK (("request_idempotency"."status" = 'processing' and "request_idempotency"."response_status" is null and "request_idempotency"."response_metadata" is null and "request_idempotency"."locked_until" is not null) or ("request_idempotency"."status" = 'completed' and "request_idempotency"."response_status" between 200 and 599 and "request_idempotency"."response_metadata" is not null and "request_idempotency"."locked_until" is null))
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"stripe_event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"event_created_at" timestamp with time zone NOT NULL,
	"status" "stripe_event_status" DEFAULT 'received' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"processed_at" timestamp with time zone,
	"next_retry_at" timestamp with time zone,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_events_id_check" CHECK ("stripe_events"."stripe_event_id" ~ '^evt_'),
	CONSTRAINT "stripe_events_type_check" CHECK ("stripe_events"."event_type" ~ '^[a-z]+(\.[a-z_]+)+$' and length("stripe_events"."event_type") <= 128),
	CONSTRAINT "stripe_events_attempt_check" CHECK ("stripe_events"."attempt_count" >= 0),
	CONSTRAINT "stripe_events_failure_code_check" CHECK ("stripe_events"."failure_code" is null or "stripe_events"."failure_code" in ('database_retryable','lock_retryable','stripe_read_retryable','wrong_mode','malformed_supported_object','price_mismatch','product_mismatch','unknown_intent','unknown_customer','identifier_mismatch','metadata_mismatch')),
	CONSTRAINT "stripe_events_state_check" CHECK (("stripe_events"."status" in ('received','processing') and "stripe_events"."processed_at" is null and "stripe_events"."next_retry_at" is null and "stripe_events"."failure_code" is null) or ("stripe_events"."status" in ('processed','ignored') and "stripe_events"."processed_at" is not null and "stripe_events"."next_retry_at" is null and "stripe_events"."failure_code" is null) or ("stripe_events"."status" = 'retryable_failed' and "stripe_events"."processed_at" is null and "stripe_events"."next_retry_at" is not null and "stripe_events"."failure_code" in ('database_retryable','lock_retryable','stripe_read_retryable')) or ("stripe_events"."status" = 'terminal_failed' and "stripe_events"."processed_at" is not null and "stripe_events"."next_retry_at" is null and "stripe_events"."failure_code" in ('wrong_mode','malformed_supported_object','price_mismatch','product_mismatch','unknown_intent','unknown_customer','identifier_mismatch','metadata_mismatch')))
);
--> statement-breakpoint
ALTER TABLE "billing_checkout_intents" ADD CONSTRAINT "billing_checkout_intents_request_idempotency_id_request_idempotency_id_fk" FOREIGN KEY ("request_idempotency_id") REFERENCES "public"."request_idempotency"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_checkout_intents" ADD CONSTRAINT "billing_checkout_intents_stripe_customer_id_billing_customers_stripe_customer_id_fk" FOREIGN KEY ("stripe_customer_id") REFERENCES "public"."billing_customers"("stripe_customer_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bootstrap_claims" ADD CONSTRAINT "bootstrap_claims_entitlement_id_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."entitlements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement_transitions" ADD CONSTRAINT "entitlement_transitions_entitlement_id_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."entitlements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlement_transitions" ADD CONSTRAINT "entitlement_transitions_stripe_event_id_stripe_events_stripe_event_id_fk" FOREIGN KEY ("stripe_event_id") REFERENCES "public"."stripe_events"("stripe_event_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_clerk_subject_billing_customers_clerk_subject_fk" FOREIGN KEY ("clerk_subject") REFERENCES "public"."billing_customers"("clerk_subject") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_stripe_customer_id_billing_customers_stripe_customer_id_fk" FOREIGN KEY ("stripe_customer_id") REFERENCES "public"."billing_customers"("stripe_customer_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_last_stripe_event_id_stripe_events_stripe_event_id_fk" FOREIGN KEY ("last_stripe_event_id") REFERENCES "public"."stripe_events"("stripe_event_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bootstrap_claim_attempts_ip_created_idx" ON "bootstrap_claim_attempts" USING btree ("source_ip_hash","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bootstrap_claims_active_subject_entitlement_unique" ON "bootstrap_claims" USING btree ("clerk_subject","entitlement_id") WHERE "bootstrap_claims"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_subject_product_unique" ON "entitlements" USING btree ("clerk_subject","product");--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_active_subject_product_unique" ON "entitlements" USING btree ("clerk_subject","product") WHERE "entitlements"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "request_idempotency_route_principal_key_unique" ON "request_idempotency" USING btree ("route","principal","idempotency_key");--> statement-breakpoint
CREATE INDEX "request_idempotency_expiry_idx" ON "request_idempotency" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "request_idempotency_processing_lease_idx" ON "request_idempotency" USING btree ("locked_until");--> statement-breakpoint
CREATE INDEX "stripe_events_status_retry_updated_idx" ON "stripe_events" USING btree ("status","next_retry_at","updated_at");