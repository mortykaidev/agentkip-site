ALTER TABLE "stripe_events"
	DROP CONSTRAINT "stripe_events_type_check",
	ADD CONSTRAINT "stripe_events_type_check" CHECK ("stripe_events"."event_type" ~ '^[a-z0-9_]+(\[[a-z0-9_]+(\.[a-z0-9_]+)*\])?(\.[a-z0-9_]+(\[[a-z0-9_]+(\.[a-z0-9_]+)*\])?)+$' and length("stripe_events"."event_type") <= 128);
--> statement-breakpoint
ALTER TABLE "bootstrap_claims"
	ADD CONSTRAINT "bootstrap_claims_revoke_reason_check" CHECK ("bootstrap_claims"."revoke_reason" is null or "bootstrap_claims"."revoke_reason" in ('delivery_uncertain','entitlement_inactive')),
	DROP CONSTRAINT "bootstrap_claims_lifecycle_check",
	ADD CONSTRAINT "bootstrap_claims_lifecycle_check" CHECK (("bootstrap_claims"."status" = 'consumed' and "bootstrap_claims"."consumed_at" is not null and "bootstrap_claims"."redemption_id" is not null and "bootstrap_claims"."revoked_at" is null and "bootstrap_claims"."revoke_reason" is null) or ("bootstrap_claims"."status" in ('active','expired') and "bootstrap_claims"."redemption_id" is null and "bootstrap_claims"."consumed_at" is null and "bootstrap_claims"."revoked_at" is null and "bootstrap_claims"."revoke_reason" is null) or ("bootstrap_claims"."status" = 'revoked' and "bootstrap_claims"."redemption_id" is null and "bootstrap_claims"."revoked_at" is not null and "bootstrap_claims"."revoke_reason" is not null));
