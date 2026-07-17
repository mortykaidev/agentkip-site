CREATE TABLE "bootstrap_claim_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"principal" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_digest" text NOT NULL,
	"response_status" integer NOT NULL,
	"response_metadata" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bootstrap_claim_redemptions_principal_check" CHECK ("bootstrap_claim_redemptions"."principal" = 'agentkip-control-plane'),
	CONSTRAINT "bootstrap_claim_redemptions_key_check" CHECK ("bootstrap_claim_redemptions"."idempotency_key" ~ '^[A-Za-z0-9._:-]{8,128}$'),
	CONSTRAINT "bootstrap_claim_redemptions_digest_check" CHECK ("bootstrap_claim_redemptions"."request_digest" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "bootstrap_claim_redemptions_status_check" CHECK ("bootstrap_claim_redemptions"."response_status" = 200),
	CONSTRAINT "bootstrap_claim_redemptions_metadata_check" CHECK (jsonb_typeof("bootstrap_claim_redemptions"."response_metadata") = 'object' and "bootstrap_claim_redemptions"."response_metadata" ?& array['redemption_id','subject','entitlement','product'] and ("bootstrap_claim_redemptions"."response_metadata" - 'redemption_id' - 'subject' - 'entitlement' - 'product') = '{}'::jsonb and jsonb_typeof("bootstrap_claim_redemptions"."response_metadata"->'redemption_id') = 'string' and ("bootstrap_claim_redemptions"."response_metadata"->>'redemption_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' and jsonb_typeof("bootstrap_claim_redemptions"."response_metadata"->'subject') = 'string' and ("bootstrap_claim_redemptions"."response_metadata"->>'subject') ~ '^[A-Za-z0-9_-]{1,255}$' and jsonb_typeof("bootstrap_claim_redemptions"."response_metadata"->'entitlement') = 'string' and ("bootstrap_claim_redemptions"."response_metadata"->>'entitlement') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' and jsonb_typeof("bootstrap_claim_redemptions"."response_metadata"->'product') = 'string' and "bootstrap_claim_redemptions"."response_metadata"->>'product' = 'tester'),
	CONSTRAINT "bootstrap_claim_redemptions_expiry_check" CHECK ("bootstrap_claim_redemptions"."expires_at" > "bootstrap_claim_redemptions"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bootstrap_claim_redemptions_principal_key_unique" ON "bootstrap_claim_redemptions" USING btree ("principal","idempotency_key");--> statement-breakpoint
CREATE INDEX "bootstrap_claim_redemptions_expiry_idx" ON "bootstrap_claim_redemptions" USING btree ("expires_at");