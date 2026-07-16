import { readFile } from "node:fs/promises";
import path from "node:path";
import { DrizzleQueryError } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, type DatabaseError } from "pg";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterEach, describe, expect, it } from "vitest";

const root = process.cwd();
const migrations = [
  "drizzle/0000_site_baseline.sql",
  "drizzle/0001_w1_billing_entitlement.sql",
  "drizzle/0002_w1_constraint_repair.sql",
  "drizzle/0003_w1_redemption_recovery.sql",
];
const containers: Array<Awaited<ReturnType<PostgreSqlContainer["start"]>>> = [];

const expectedTableNames = [
  "billing_checkout_intents", "billing_customers", "bootstrap_claim_attempts", "bootstrap_claim_redemptions", "bootstrap_claims", "contact_messages", "content_sections",
  "entitlement_transitions", "entitlements", "request_idempotency", "stripe_events", "waitlist",
];

const expectedEnumValues = [
  "bootstrap_claim_status|active", "bootstrap_claim_status|consumed", "bootstrap_claim_status|expired", "bootstrap_claim_status|revoked",
  "entitlement_product|agentkip_first_friend", "entitlement_source|stripe_subscription", "entitlement_status|pending", "entitlement_status|active",
  "entitlement_status|past_due", "entitlement_status|revoked", "request_idempotency_status|processing", "request_idempotency_status|completed",
  "stripe_event_status|received", "stripe_event_status|processing", "stripe_event_status|processed", "stripe_event_status|ignored",
  "stripe_event_status|retryable_failed", "stripe_event_status|terminal_failed",
];

const expectedConstraints = [
  "billing_checkout_intents:billing_checkout_intents_pkey:p",
  "billing_checkout_intents:billing_checkout_intents_request_idempotency_id_request_idempot:f",
  "billing_checkout_intents:billing_checkout_intents_request_idempotency_id_unique:u",
  "billing_checkout_intents:billing_checkout_intents_stripe_checkout_session_id_unique:u",
  "billing_checkout_intents:billing_checkout_intents_stripe_customer_id_billing_customers_s:f",
  "billing_checkout_intents:billing_checkout_intents_stripe_subscription_id_unique:u",
  "billing_checkout_intents:checkout_intents_dependency_check:c",
  "billing_checkout_intents:checkout_intents_provider_ids:c",
  "billing_checkout_intents:checkout_intents_subject_nonempty:c",
  "billing_customers:billing_customers_customer_format:c",
  "billing_customers:billing_customers_pkey:p",
  "billing_customers:billing_customers_stripe_customer_id_unique:u",
  "billing_customers:billing_customers_subject_nonempty:c",
  "bootstrap_claim_attempts:bootstrap_claim_attempts_action_check:c",
  "bootstrap_claim_attempts:bootstrap_claim_attempts_ip_hash_check:c",
  "bootstrap_claim_attempts:bootstrap_claim_attempts_pkey:p",
  "bootstrap_claim_redemptions:bootstrap_claim_redemptions_digest_check:c",
  "bootstrap_claim_redemptions:bootstrap_claim_redemptions_expiry_check:c",
  "bootstrap_claim_redemptions:bootstrap_claim_redemptions_key_check:c",
  "bootstrap_claim_redemptions:bootstrap_claim_redemptions_metadata_check:c",
  "bootstrap_claim_redemptions:bootstrap_claim_redemptions_pkey:p",
  "bootstrap_claim_redemptions:bootstrap_claim_redemptions_principal_check:c",
  "bootstrap_claim_redemptions:bootstrap_claim_redemptions_status_check:c",
  "bootstrap_claims:bootstrap_claims_claim_hash_unique:u",
  "bootstrap_claims:bootstrap_claims_entitlement_id_entitlements_id_fk:f",
  "bootstrap_claims:bootstrap_claims_expiry_check:c",
  "bootstrap_claims:bootstrap_claims_hash_check:c",
  "bootstrap_claims:bootstrap_claims_lifecycle_check:c",
  "bootstrap_claims:bootstrap_claims_pepper_check:c",
  "bootstrap_claims:bootstrap_claims_pkey:p",
  "bootstrap_claims:bootstrap_claims_redemption_id_unique:u",
  "bootstrap_claims:bootstrap_claims_revoke_reason_check:c",
  "contact_messages:contact_messages_pkey:p",
  "content_sections:content_sections_pkey:p",
  "entitlement_transitions:entitlement_transitions_entitlement_id_entitlements_id_fk:f",
  "entitlement_transitions:entitlement_transitions_pkey:p",
  "entitlement_transitions:entitlement_transitions_reason_check:c",
  "entitlement_transitions:entitlement_transitions_stripe_event_id_stripe_events_stripe_ev:f",
  "entitlement_transitions:entitlement_transitions_stripe_event_id_unique:u",
  "entitlements:entitlements_clerk_subject_billing_customers_clerk_subject_fk:f",
  "entitlements:entitlements_last_stripe_event_id_stripe_events_stripe_event_id:f",
  "entitlements:entitlements_pkey:p",
  "entitlements:entitlements_status_dates_check:c",
  "entitlements:entitlements_stripe_checkout_session_id_unique:u",
  "entitlements:entitlements_stripe_customer_id_billing_customers_stripe_custom:f",
  "entitlements:entitlements_stripe_subscription_id_unique:u",
  "request_idempotency:request_idempotency_digest_check:c",
  "request_idempotency:request_idempotency_expiry_check:c",
  "request_idempotency:request_idempotency_key_check:c",
  "request_idempotency:request_idempotency_pkey:p",
  "request_idempotency:request_idempotency_route_check:c",
  "request_idempotency:request_idempotency_state_check:c",
  "stripe_events:stripe_events_attempt_check:c",
  "stripe_events:stripe_events_failure_code_check:c",
  "stripe_events:stripe_events_id_check:c",
  "stripe_events:stripe_events_pkey:p",
  "stripe_events:stripe_events_state_check:c",
  "stripe_events:stripe_events_type_check:c",
  "waitlist:waitlist_email_unique:u",
  "waitlist:waitlist_pkey:p",
];

const expectedApplicationIndexes = [
  "bootstrap_claim_attempts_ip_created_idx", "bootstrap_claim_redemptions_expiry_idx", "bootstrap_claim_redemptions_principal_key_unique", "bootstrap_claims_active_subject_entitlement_unique", "entitlements_active_subject_product_unique",
  "entitlements_subject_product_unique", "request_idempotency_expiry_idx", "request_idempotency_processing_lease_idx",
  "request_idempotency_route_principal_key_unique", "stripe_events_status_retry_updated_idx",
];

type RepresentativeState = {
  columns: Array<{ table_name: string; ordinal_position: number; column_name: string; data_type: string; udt_name: string; is_nullable: string; column_default: string | null }>;
  constraints: Array<{ table_name: string; conname: string; contype: string; constraint_definition: string }>;
  counts: { contact_messages: number; content_sections: number; waitlist: number };
  content_sections: Array<{ key: string; value: { title: string }; updated_at: Date }>;
  waitlist: Array<{ id: number; email: string; created_at: Date }>;
  contact_messages: Array<{ id: number; name: string; email: string; message: string; created_at: Date }>;
  sequences: { waitlist: { last_value: number; is_called: boolean }; contact_messages: { last_value: number; is_called: boolean } };
};

const expectedRepresentativeState: RepresentativeState = {
  columns: [
    { table_name: "contact_messages", ordinal_position: 1, column_name: "id", data_type: "integer", udt_name: "int4", is_nullable: "NO", column_default: "nextval('contact_messages_id_seq'::regclass)" },
    { table_name: "contact_messages", ordinal_position: 2, column_name: "name", data_type: "text", udt_name: "text", is_nullable: "NO", column_default: null },
    { table_name: "contact_messages", ordinal_position: 3, column_name: "email", data_type: "text", udt_name: "text", is_nullable: "NO", column_default: null },
    { table_name: "contact_messages", ordinal_position: 4, column_name: "message", data_type: "text", udt_name: "text", is_nullable: "NO", column_default: null },
    { table_name: "contact_messages", ordinal_position: 5, column_name: "created_at", data_type: "timestamp with time zone", udt_name: "timestamptz", is_nullable: "NO", column_default: "now()" },
    { table_name: "content_sections", ordinal_position: 1, column_name: "key", data_type: "text", udt_name: "text", is_nullable: "NO", column_default: null },
    { table_name: "content_sections", ordinal_position: 2, column_name: "value", data_type: "jsonb", udt_name: "jsonb", is_nullable: "NO", column_default: null },
    { table_name: "content_sections", ordinal_position: 3, column_name: "updated_at", data_type: "timestamp with time zone", udt_name: "timestamptz", is_nullable: "NO", column_default: "now()" },
    { table_name: "waitlist", ordinal_position: 1, column_name: "id", data_type: "integer", udt_name: "int4", is_nullable: "NO", column_default: "nextval('waitlist_id_seq'::regclass)" },
    { table_name: "waitlist", ordinal_position: 2, column_name: "email", data_type: "text", udt_name: "text", is_nullable: "NO", column_default: null },
    { table_name: "waitlist", ordinal_position: 3, column_name: "created_at", data_type: "timestamp with time zone", udt_name: "timestamptz", is_nullable: "NO", column_default: "now()" },
  ],
  constraints: [
    { table_name: "contact_messages", conname: "contact_messages_pkey", contype: "p", constraint_definition: "PRIMARY KEY (id)" },
    { table_name: "content_sections", conname: "content_sections_pkey", contype: "p", constraint_definition: "PRIMARY KEY (key)" },
    { table_name: "waitlist", conname: "waitlist_email_unique", contype: "u", constraint_definition: "UNIQUE (email)" },
    { table_name: "waitlist", conname: "waitlist_pkey", contype: "p", constraint_definition: "PRIMARY KEY (id)" },
  ],
  counts: { contact_messages: 1, content_sections: 1, waitlist: 1 },
  content_sections: [{ key: "hero", value: { title: "AgentKip" }, updated_at: new Date("2026-01-02T03:04:05.678Z") }],
  waitlist: [{ id: 41, email: "fixture@example.invalid", created_at: new Date("2026-01-03T04:05:06.789Z") }],
  contact_messages: [{ id: 73, name: "Fixture", email: "fixture@example.invalid", message: "preserve me", created_at: new Date("2026-01-04T05:06:07.890Z") }],
  sequences: { waitlist: { last_value: 41, is_called: true }, contact_messages: { last_value: 73, is_called: true } },
};

async function executeScript(client: Client, filename: string) {
  const script = await readFile(path.join(root, filename), "utf8");
  for (const statement of script.split("--> statement-breakpoint").map((part) => part.trim()).filter(Boolean)) {
    await client.query(statement);
  }
}

async function createClient() {
  const container = await new PostgreSqlContainer("postgres:17-alpine").start();
  containers.push(container);
  const client = new Client({ connectionString: container.getConnectionUri() });
  await client.connect();
  return client;
}

async function applyMigrations(client: Client) {
  await client.query("begin");
  try {
    for (const migration of migrations) await executeScript(client, migration);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function applyImmutableMigrations(client: Client) {
  await executeScript(client, "drizzle/0000_site_baseline.sql");
  await executeScript(client, "drizzle/0001_w1_billing_entitlement.sql");
}

async function recordMigrationsThrough0001(client: Client) {
  await client.query('create schema drizzle');
  await client.query('create table drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)');
  await client.query(
    "insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2), ($3, $4)",
    [
      "bb8a61b710c9bb9a34cbedc1176c701ba17e2a89526713f06dd036649714e6cc",
      1783951023454,
      "89f426d501dadd27100e6b54d675864949660a48c3be36c64769976ddd4bc42c",
      1783951023728,
    ],
  );
}

async function applyCanonicalMigrations(client: Client) {
  await migrate(drizzle(client), { migrationsFolder: path.join(root, "drizzle") });
}

async function readLedger(client: Client) {
  return client.query<{ hash: string; created_at: string }>("select hash, created_at from drizzle.__drizzle_migrations order by created_at");
}

async function seedClaimDependencies(client: Client, suffix: number) {
  const id = String(suffix).padStart(12, "0");
  const entitlementId = `00000000-0000-4000-8000-${id}`;
  const stripeEventId = `evt_seed_${suffix}`;
  const subject = `subject-${suffix}`;
  const customer = `cus_seed_${suffix}`;
  await client.query("insert into billing_customers (clerk_subject, stripe_customer_id) values ($1, $2)", [subject, customer]);
  await client.query("insert into stripe_events (stripe_event_id, event_type, event_created_at, status, attempt_count, processed_at) values ($1, 'billing.session.created', now(), 'ignored', 0, now())", [stripeEventId]);
  await client.query(
    "insert into entitlements (id, clerk_subject, product, status, source, stripe_customer_id, stripe_subscription_id, last_stripe_event_id, last_event_created_at, last_event_precedence, granted_at) values ($1, $2, 'agentkip_first_friend', 'active', 'stripe_subscription', $3, $4, $5, now(), 1, now())",
    [entitlementId, subject, customer, `sub_seed_${suffix}`, stripeEventId],
  );
  return { entitlementId, subject };
}

async function insertClaim(
  client: Client,
  suffix: number,
  status: "active" | "expired" | "consumed" | "revoked",
  revokeReason: string | null,
) {
  const dependency = await seedClaimDependencies(client, suffix);
  const id = `10000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
  const redemptionId = status === "consumed" ? `20000000-0000-4000-8000-${String(suffix).padStart(12, "0")}` : null;
  const consumedAt = status === "consumed" ? new Date("2026-07-13T00:00:00.000Z") : null;
  const revokedAt = status === "revoked" ? new Date("2026-07-13T00:00:00.000Z") : null;
  await client.query(
    "insert into bootstrap_claims (id, entitlement_id, clerk_subject, product, claim_hash, pepper_version, status, expires_at, redemption_id, consumed_at, revoked_at, revoke_reason) values ($1, $2, $3, 'agentkip_first_friend', $4, 1, $5, now() + interval '15 minutes', $6, $7, $8, $9)",
    [id, dependency.entitlementId, dependency.subject, String(suffix).padStart(64, "a"), status, redemptionId, consumedAt, revokedAt, revokeReason],
  );
  return { id, revokeReason, status };
}

async function expectConstraintFailure(
  operation: () => Promise<unknown>,
  constraint: string | undefined,
) {
  try {
    await operation();
    throw new Error("expected PostgreSQL check violation");
  } catch (error) {
    const pgError = error as { code?: string; constraint?: string };
    expect(pgError.code).toBe("23514");
    if (constraint) expect(pgError.constraint).toBe(constraint);
  }
}

async function readConstraintDefinitions(client: Client, names: string[]) {
  const result = await client.query<{ conname: string; definition: string }>(
    "select conname, pg_get_constraintdef(oid, true) as definition from pg_constraint where conrelid = $1::regclass and conname = any($2::text[]) order by conname",
    ["bootstrap_claims", names],
  );
  return result.rows;
}

async function readAtomicRollbackState(client: Client) {
  const tableDefinitions = await client.query("select tables.table_name, tables.table_type, columns.ordinal_position, columns.column_name, columns.data_type, columns.udt_schema, columns.udt_name, columns.is_nullable, columns.column_default, columns.character_maximum_length, columns.numeric_precision, columns.numeric_scale, columns.datetime_precision, columns.is_identity, columns.identity_generation, columns.is_generated, columns.generation_expression from information_schema.tables tables join information_schema.columns columns on columns.table_catalog = tables.table_catalog and columns.table_schema = tables.table_schema and columns.table_name = tables.table_name where tables.table_schema = 'public' and tables.table_type = 'BASE TABLE' order by tables.table_name, columns.ordinal_position");
  const constraints = await client.query("select table_class.relname as table_name, constraint_definition.conname as constraint_name, constraint_definition.contype as constraint_type, constraint_definition.condeferrable as is_deferrable, constraint_definition.condeferred as is_initially_deferred, constraint_definition.convalidated as is_validated, pg_get_constraintdef(constraint_definition.oid, true) as definition from pg_constraint constraint_definition join pg_class table_class on table_class.oid = constraint_definition.conrelid join pg_namespace namespace on namespace.oid = table_class.relnamespace where namespace.nspname = 'public' and table_class.relkind = 'r' order by table_class.relname, constraint_definition.conname");
  const rowCounts = await client.query("select (select count(*)::int from billing_checkout_intents) as billing_checkout_intents, (select count(*)::int from billing_customers) as billing_customers, (select count(*)::int from bootstrap_claim_attempts) as bootstrap_claim_attempts, (select count(*)::int from bootstrap_claims) as bootstrap_claims, (select count(*)::int from contact_messages) as contact_messages, (select count(*)::int from content_sections) as content_sections, (select count(*)::int from entitlement_transitions) as entitlement_transitions, (select count(*)::int from entitlements) as entitlements, (select count(*)::int from request_idempotency) as request_idempotency, (select count(*)::int from stripe_events) as stripe_events, (select count(*)::int from waitlist) as waitlist");
  const ledger = await client.query("select id, hash, created_at from drizzle.__drizzle_migrations order by id");
  const billingCustomers = await client.query("select * from billing_customers order by clerk_subject");
  const stripeEvents = await client.query("select * from stripe_events order by stripe_event_id");
  const entitlements = await client.query("select * from entitlements order by id");
  const bootstrapClaims = await client.query("select * from bootstrap_claims order by id");

  return {
    tableDefinitions: tableDefinitions.rows,
    constraints: constraints.rows,
    rowCounts: rowCounts.rows[0],
    ledger: ledger.rows,
    billingCustomers: billingCustomers.rows,
    stripeEvents: stripeEvents.rows,
    entitlements: entitlements.rows,
    bootstrapClaims: bootstrapClaims.rows,
  };
}

async function readRepresentativeState(client: Client): Promise<RepresentativeState> {
  const baselineTables = ["contact_messages", "content_sections", "waitlist"];
  const columns = await client.query<RepresentativeState["columns"][number]>("select table_name, ordinal_position, column_name, data_type, udt_name, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = any($1::text[]) order by table_name, ordinal_position", [baselineTables]);
  const constraints = await client.query<RepresentativeState["constraints"][number]>("select cls.relname as table_name, con.conname, con.contype, pg_get_constraintdef(con.oid, true) as constraint_definition from pg_constraint con join pg_class cls on cls.oid = con.conrelid join pg_namespace namespace on namespace.oid = cls.relnamespace where namespace.nspname = 'public' and cls.relname = any($1::text[]) order by cls.relname, con.conname", [baselineTables]);
  const counts = await client.query<RepresentativeState["counts"]>("select (select count(*)::int from contact_messages) as contact_messages, (select count(*)::int from content_sections) as content_sections, (select count(*)::int from waitlist) as waitlist");
  const contentSections = await client.query<RepresentativeState["content_sections"][number]>("select key, value, updated_at from content_sections order by key");
  const waitlist = await client.query<RepresentativeState["waitlist"][number]>("select id, email, created_at from waitlist order by id");
  const contactMessages = await client.query<RepresentativeState["contact_messages"][number]>("select id, name, email, message, created_at from contact_messages order by id");
  const waitlistSequence = await client.query<{ last_value: string; is_called: boolean }>("select last_value, is_called from public.waitlist_id_seq");
  const contactMessagesSequence = await client.query<{ last_value: string; is_called: boolean }>("select last_value, is_called from public.contact_messages_id_seq");

  return {
    columns: columns.rows,
    constraints: constraints.rows,
    counts: counts.rows[0],
    content_sections: contentSections.rows,
    waitlist: waitlist.rows,
    contact_messages: contactMessages.rows,
    sequences: {
      waitlist: { last_value: Number(waitlistSequence.rows[0].last_value), is_called: waitlistSequence.rows[0].is_called },
      contact_messages: { last_value: Number(contactMessagesSequence.rows[0].last_value), is_called: contactMessagesSequence.rows[0].is_called },
    },
  };
}

afterEach(async () => {
  await Promise.all(containers.splice(0).map((container) => container.stop()));
});

describe("W1 C5 bounded webhook fulfillment", () => {
  it("drives a valid webhook through the disposable repository and commits one terminal event, transition, and lifecycle row", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const now = new Date("2026-07-14T12:00:00.000Z");
      const subject = "c5-db-subject";
      const requestId = "50000000-0000-4000-8000-000000000001";
      const intentId = "50000000-0000-4000-8000-000000000002";
      await client.query("insert into billing_customers (clerk_subject, stripe_customer_id) values ($1, 'cus_c5db')", [subject]);
      await client.query("insert into request_idempotency (id, route, principal, idempotency_key, request_digest, locked_until, expires_at) values ($1, '/api/billing/checkout', $2, 'c5-db-key', $3, now(), now() + interval '1 day')", [requestId, subject, "a".repeat(64)]);
      await client.query("insert into billing_checkout_intents (id, request_idempotency_id, clerk_subject, product, configured_price_id, configured_stripe_product_id, stripe_customer_id, stripe_checkout_session_id, stripe_subscription_id) values ($1, $2, $3, 'agentkip_first_friend', 'price_c5db', 'prod_c5db', 'cus_c5db', 'cs_test_c5db', 'sub_c5db')", [intentId, requestId, subject]);
      let reads = 0;
      const services = createW1Services({ repository: createW1Repository(c2Port(client)), clock: { now: () => now }, webhookStripe: { verifyWebhook: () => { throw new Error("not used"); }, loadAuthorityBundle: async () => { reads += 1; return { valid: true, reference: { sessionId: "cs_test_c5db", subscriptionId: "sub_c5db", customerId: "cus_c5db" }, status: "active", clerkSubject: subject, checkoutRequestId: intentId, priceId: "price_c5db", productId: "prod_c5db" }; } } });
      await expect(services.handleWebhook({ id: "evt_C5db", type: "invoice.paid", createdAt: now, livemode: false, object: {} }, "50000000-0000-4000-8000-000000000003")).resolves.toEqual({ received: true });
      await expect(services.handleWebhook({ id: "evt_C5db", type: "invoice.paid", createdAt: now, livemode: false, object: {} }, "50000000-0000-4000-8000-000000000004")).resolves.toEqual({ received: true });
      expect(reads).toBe(1);
      const events = await client.query<{ status: string; attempt_count: number; failure_code: string | null }>("select status, attempt_count, failure_code from stripe_events where stripe_event_id='evt_C5db'");
      const entitlements = await client.query<{ status: string; granted_at: Date | null; revoked_at: Date | null }>("select status, granted_at, revoked_at from entitlements where clerk_subject=$1", [subject]);
      const transitions = await client.query<{ count: string }>("select count(*) from entitlement_transitions where stripe_event_id='evt_C5db'");
      expect(events.rows).toEqual([{ status: "processed", attempt_count: 1, failure_code: null }]);
      expect(entitlements.rows).toEqual([{ status: "active", granted_at: now, revoked_at: null }]);
      expect(transitions.rows).toEqual([{ count: "1" }]);
    } finally { await client.end(); }
  }, 30_000);
});

describe("W1 bootstrap claim repository decoders", () => {
  it("drives issue, reissue, revoke, and redeem through the production repository against real timestamptz columns", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const { BOOTSTRAP_CLAIM_REDEEM_ROUTE, INTERNAL_REDEEM_PRINCIPAL } = await import("@/lib/w1/constants");
      const { digestRequest } = await import("@/lib/w1/crypto");
      const subject = "claimdb-subject";
      const { rows: [{ now }] } = await client.query<{ now: Date }>("select now() as now");
      await client.query("insert into billing_customers (clerk_subject, stripe_customer_id) values ($1, 'cus_claimdb')", [subject]);
      await client.query("insert into stripe_events (stripe_event_id, event_type, event_created_at, status, attempt_count, processed_at, failure_code) values ('evt_claimdb', 'checkout.session.completed', $1, 'processed', 1, $1, null)", [now]);
      await client.query("insert into entitlements (clerk_subject, product, status, source, stripe_customer_id, stripe_checkout_session_id, stripe_subscription_id, last_stripe_event_id, last_event_created_at, last_event_precedence, granted_at, revoked_at, updated_at) values ($1, 'agentkip_first_friend', 'active', 'stripe_subscription', 'cus_claimdb', 'cs_test_claimdb', 'sub_claimdb', 'evt_claimdb', $2, 10, $2, null, now())", [subject, now]);
      const services = createW1Services({ repository: createW1Repository(c2Port(client)), clock: { now: () => now }, claimPepper: "claimdb-pepper", rateLimitPepper: "claimdb-rate-pepper" });
      const issued = await services.issueClaim(subject, "claimdb-issue-key", "e".repeat(64), "c".repeat(64));
      expect(issued.claim).toMatch(/^akc1\./);
      const reissued = await services.reissueClaim(subject, issued.claim_id, "claimdb-reissue-key", "f".repeat(64), "c".repeat(64));
      expect(reissued.claim_id).not.toBe(issued.claim_id);
      const redeemKey = "claimdb-redeem-key";
      const redeemDigest = digestRequest("POST", BOOTSTRAP_CLAIM_REDEEM_ROUTE, { claim: reissued.claim });
      const redeemed = await services.redeemClaim(reissued.claim, redeemKey, redeemDigest);
      expect(redeemed).toMatchObject({ subject, product: "tester" });
      await expect(services.redeemClaim(reissued.claim, redeemKey, redeemDigest)).resolves.toEqual(redeemed);
      await expect(services.redeemClaim(reissued.claim, redeemKey, "0".repeat(64))).rejects.toMatchObject({ code: "idempotency_conflict" });
      await expect(services.redeemClaim(reissued.claim, "claimdb-other-key", redeemDigest)).rejects.toMatchObject({ code: "claim_not_found" });
      const redemptionRows = await client.query<{ id: string; principal: string; response_metadata: unknown }>("select id, principal, response_metadata from bootstrap_claim_redemptions");
      expect(redemptionRows.rows[0]?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(redemptionRows.rows.map(({ principal, response_metadata }) => ({ principal, response_metadata }))).toEqual([{ principal: INTERNAL_REDEEM_PRINCIPAL, response_metadata: redeemed }]);
      expect(JSON.stringify(redemptionRows.rows)).not.toContain(reissued.claim);
      await expect(services.revokeClaim(subject, issued.claim_id, "claimdb-revoke-key", "a".repeat(64))).resolves.toMatchObject({ claim_id: issued.claim_id, status: "revoked" });
    } finally { await client.end(); }
  }, 30_000);

  it("uses PostgreSQL wall time as the final claim-expiry authority", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const dependency = await seedClaimDependencies(client, 904);
      const claimId = "10000000-0000-4000-8000-000000000904";
      await client.query(
        "insert into bootstrap_claims (id, entitlement_id, clerk_subject, product, claim_hash, pepper_version, status, expires_at) values ($1, $2, $3, 'agentkip_first_friend', $4, 1, 'active', clock_timestamp() + interval '500 milliseconds')",
        [claimId, dependency.entitlementId, dependency.subject, "9".repeat(64)],
      );
      const repository = createW1Repository(c2Port(client));
      const redemption = await repository.transaction(async (tx) => {
        expect(await tx.lockClaim(claimId)).toMatchObject({ id: claimId, status: "active" });
        await new Promise((resolve) => setTimeout(resolve, 800));
        return tx.consumeClaim(claimId);
      });

      expect(redemption).toBeNull();
      expect((await client.query("select status, redemption_id, consumed_at from bootstrap_claims where id=$1", [claimId])).rows).toEqual([{ status: "active", redemption_id: null, consumed_at: null }]);
    } finally { await client.end(); }
  }, 30_000);

  it("serializes concurrent redemption and preserves one replayable non-secret result", async () => {
    const first = await createClient();
    const second = await secondClientFor(first);
    try {
      await applyMigrations(first);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const { BOOTSTRAP_CLAIM_REDEEM_ROUTE, INTERNAL_REDEEM_PRINCIPAL } = await import("@/lib/w1/constants");
      const { digestRequest } = await import("@/lib/w1/crypto");
      const subject = "claimdb-race-subject";
      const { rows: [{ now }] } = await first.query<{ now: Date }>("select now() as now");
      await first.query("insert into billing_customers (clerk_subject, stripe_customer_id) values ($1, 'cus_claimdbrace')", [subject]);
      await first.query("insert into stripe_events (stripe_event_id, event_type, event_created_at, status, attempt_count, processed_at, failure_code) values ('evt_claimdbrace', 'checkout.session.completed', $1, 'processed', 1, $1, null)", [now]);
      await first.query("insert into entitlements (clerk_subject, product, status, source, stripe_customer_id, stripe_checkout_session_id, stripe_subscription_id, last_stripe_event_id, last_event_created_at, last_event_precedence, granted_at, revoked_at, updated_at) values ($1, 'agentkip_first_friend', 'active', 'stripe_subscription', 'cus_claimdbrace', 'cs_test_claimdbrace', 'sub_claimdbrace', 'evt_claimdbrace', $2, 10, $2, null, now())", [subject, now]);
      const one = createW1Services({ repository: createW1Repository(c2Port(first)), clock: { now: () => now }, claimPepper: "claimdb-race-pepper", rateLimitPepper: "claimdb-race-rate" });
      const two = createW1Services({ repository: createW1Repository(c2Port(second)), clock: { now: () => now }, claimPepper: "claimdb-race-pepper", rateLimitPepper: "claimdb-race-rate" });
      const issued = await one.issueClaim(subject, "claimdb-race-issue", "e".repeat(64), "c".repeat(64));
      const requestDigest = digestRequest("POST", BOOTSTRAP_CLAIM_REDEEM_ROUTE, { claim: issued.claim });
      const keys = ["claimdb-race-key-a", "claimdb-race-key-b"] as const;
      const settled = await Promise.allSettled([one.redeemClaim(issued.claim, keys[0], requestDigest), two.redeemClaim(issued.claim, keys[1], requestDigest)]);
      const winners = settled.filter((result): result is PromiseFulfilledResult<import("@/lib/w1/services").ClaimRedeemResponse> => result.status === "fulfilled");
      const losers = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected");
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);
      expect(losers[0]?.reason).toMatchObject({ code: "claim_not_found" });
      const winnerIndex = settled.findIndex((result) => result.status === "fulfilled");
      const winnerKey = keys[winnerIndex];
      if (!winnerKey || !winners[0]) throw new Error("redemption winner missing");
      await expect(one.redeemClaim(issued.claim, winnerKey, requestDigest)).resolves.toEqual(winners[0].value);
      await expect(one.redeemClaim(issued.claim, winnerKey, "f".repeat(64))).rejects.toMatchObject({ code: "idempotency_conflict" });
      const rows = await first.query<{ principal: string; idempotency_key: string; request_digest: string; response_status: number; response_metadata: unknown }>("select principal, idempotency_key, request_digest, response_status, response_metadata from bootstrap_claim_redemptions");
      expect(rows.rows).toEqual([{ principal: INTERNAL_REDEEM_PRINCIPAL, idempotency_key: winnerKey, request_digest: requestDigest, response_status: 200, response_metadata: winners[0].value }]);
      const persisted = await first.query("select claim_hash, redemption_id, status from bootstrap_claims where id=$1", [issued.claim_id]);
      expect(persisted.rows).toHaveLength(1);
      expect(persisted.rows[0]).toMatchObject({ status: "consumed", redemption_id: winners[0].value.redemption_id });
      expect(JSON.stringify({ idempotency: rows.rows, claims: persisted.rows })).not.toContain(issued.claim);
    } finally {
      await second.end();
      await first.end();
    }
  }, 30_000);

  it("recovers one concurrent same-key redemption from the committed non-secret row", async () => {
    const first = await createClient();
    const second = await secondClientFor(first);
    try {
      await applyMigrations(first);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const { BOOTSTRAP_CLAIM_REDEEM_ROUTE, INTERNAL_REDEEM_PRINCIPAL } = await import("@/lib/w1/constants");
      const { digestRequest } = await import("@/lib/w1/crypto");
      const subject = "claimdb-same-key-subject";
      const { rows: [{ now }] } = await first.query<{ now: Date }>("select now() as now");
      await first.query("insert into billing_customers (clerk_subject, stripe_customer_id) values ($1, 'cus_claimdbsamekey')", [subject]);
      await first.query("insert into stripe_events (stripe_event_id, event_type, event_created_at, status, attempt_count, processed_at, failure_code) values ('evt_claimdbsamekey', 'checkout.session.completed', $1, 'processed', 1, $1, null)", [now]);
      await first.query("insert into entitlements (clerk_subject, product, status, source, stripe_customer_id, stripe_checkout_session_id, stripe_subscription_id, last_stripe_event_id, last_event_created_at, last_event_precedence, granted_at, revoked_at, updated_at) values ($1, 'agentkip_first_friend', 'active', 'stripe_subscription', 'cus_claimdbsamekey', 'cs_test_claimdbsamekey', 'sub_claimdbsamekey', 'evt_claimdbsamekey', $2, 10, $2, null, now())", [subject, now]);
      const one = createW1Services({ repository: createW1Repository(c2Port(first)), clock: { now: () => now }, claimPepper: "claimdb-same-key-pepper", rateLimitPepper: "claimdb-same-key-rate" });
      const two = createW1Services({ repository: createW1Repository(c2Port(second)), clock: { now: () => now }, claimPepper: "claimdb-same-key-pepper", rateLimitPepper: "claimdb-same-key-rate" });
      const issued = await one.issueClaim(subject, "claimdb-same-key-issue", "a".repeat(64), "b".repeat(64));
      const key = "claimdb-same-key-redeem";
      const requestDigest = digestRequest("POST", BOOTSTRAP_CLAIM_REDEEM_ROUTE, { claim: issued.claim });
      const [left, right] = await Promise.all([one.redeemClaim(issued.claim, key, requestDigest), two.redeemClaim(issued.claim, key, requestDigest)]);

      expect(left).toEqual(right);
      const rows = await first.query<{ principal: string; idempotency_key: string; response_metadata: unknown }>("select principal, idempotency_key, response_metadata from bootstrap_claim_redemptions");
      expect(rows.rows).toEqual([{ principal: INTERNAL_REDEEM_PRINCIPAL, idempotency_key: key, response_metadata: left }]);
      const claims = await first.query<{ status: string; redemption_id: string | null }>("select status, redemption_id from bootstrap_claims where id=$1", [issued.claim_id]);
      expect(claims.rows).toEqual([{ status: "consumed", redemption_id: left.redemption_id }]);
      expect(JSON.stringify({ rows: rows.rows, claims: claims.rows })).not.toContain(issued.claim);
    } finally {
      await second.end();
      await first.end();
    }
  }, 30_000);

  it("races redemption against reissue without deadlock and commits one coherent outcome", async () => {
    const first = await createClient();
    const second = await secondClientFor(first);
    try {
      await applyMigrations(first);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const { BOOTSTRAP_CLAIM_REDEEM_ROUTE } = await import("@/lib/w1/constants");
      const { digestRequest } = await import("@/lib/w1/crypto");
      const subject = "claimdb-redeem-reissue-race";
      const { rows: [{ now }] } = await first.query<{ now: Date }>("select now() as now");
      await first.query("insert into billing_customers (clerk_subject, stripe_customer_id) values ($1, 'cus_claimdbrerace')", [subject]);
      await first.query("insert into stripe_events (stripe_event_id, event_type, event_created_at, status, attempt_count, processed_at, failure_code) values ('evt_claimdbrerace', 'checkout.session.completed', $1, 'processed', 1, $1, null)", [now]);
      await first.query("insert into entitlements (clerk_subject, product, status, source, stripe_customer_id, stripe_checkout_session_id, stripe_subscription_id, last_stripe_event_id, last_event_created_at, last_event_precedence, granted_at, revoked_at, updated_at) values ($1, 'agentkip_first_friend', 'active', 'stripe_subscription', 'cus_claimdbrerace', 'cs_test_claimdbrerace', 'sub_claimdbrerace', 'evt_claimdbrerace', $2, 10, $2, null, now())", [subject, now]);
      const one = createW1Services({ repository: createW1Repository(c2Port(first)), clock: { now: () => now }, claimPepper: "claimdb-redeem-reissue-pepper", rateLimitPepper: "claimdb-redeem-reissue-rate" });
      const two = createW1Services({ repository: createW1Repository(c2Port(second)), clock: { now: () => now }, claimPepper: "claimdb-redeem-reissue-pepper", rateLimitPepper: "claimdb-redeem-reissue-rate" });
      const issued = await one.issueClaim(subject, "claimdb-rerace-issue", "a".repeat(64), "b".repeat(64));
      const redeemDigest = digestRequest("POST", BOOTSTRAP_CLAIM_REDEEM_ROUTE, { claim: issued.claim });
      const race = Promise.allSettled([
        one.redeemClaim(issued.claim, "claimdb-rerace-redeem", redeemDigest),
        two.reissueClaim(subject, issued.claim_id, "claimdb-rerace-reissue", "c".repeat(64), "d".repeat(64)),
      ]);
      let deadline: ReturnType<typeof setTimeout> | undefined;
      const settled = await Promise.race([
        race,
        new Promise<never>((_resolve, reject) => { deadline = setTimeout(() => reject(new Error("redeem/reissue race deadlocked")), 5_000); }),
      ]).finally(() => { if (deadline) clearTimeout(deadline); });

      expect(settled.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(settled.filter((result) => result.status === "rejected")).toHaveLength(1);
      const claimRows = await first.query<{ id: string; status: string; redemption_id: string | null; revoke_reason: string | null }>("select id, status, redemption_id, revoke_reason from bootstrap_claims order by created_at, id");
      const operationCount = Number((await first.query<{ count: string }>("select count(*) from bootstrap_claim_redemptions")).rows[0]?.count ?? -1);
      const active = claimRows.rows.filter((row) => row.status === "active");

      if (settled[0]?.status === "fulfilled") {
        expect(settled[1]).toMatchObject({ status: "rejected", reason: { code: "claim_already_consumed" } });
        expect(claimRows.rows).toEqual([{ id: issued.claim_id, status: "consumed", redemption_id: settled[0].value.redemption_id, revoke_reason: null }]);
        expect(operationCount).toBe(1);
        expect(active).toHaveLength(0);
      } else {
        expect(settled[0]).toMatchObject({ status: "rejected", reason: { code: "claim_not_found" } });
        expect(settled[1]?.status).toBe("fulfilled");
        if (settled[1]?.status !== "fulfilled") throw new Error("reissue winner missing");
        expect(claimRows.rows).toContainEqual({ id: issued.claim_id, status: "revoked", redemption_id: null, revoke_reason: "delivery_uncertain" });
        expect(claimRows.rows).toContainEqual(expect.objectContaining({ id: settled[1].value.claim_id, status: "active", redemption_id: null, revoke_reason: null }));
        expect(operationCount).toBe(0);
        expect(active).toHaveLength(1);
      }
      expect(JSON.stringify(claimRows.rows)).not.toContain(issued.claim);
    } finally {
      await second.end();
      await first.end();
    }
  }, 30_000);
});

describe("W1 additive migrations", () => {
  it("applies the baseline and W1 schema to an empty disposable database", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const tables = await client.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name");
      const enums = await client.query<{ enum_name: string; enum_value: string }>("select type.typname as enum_name, enum.enumlabel as enum_value from pg_type type join pg_enum enum on enum.enumtypid = type.oid join pg_namespace namespace on namespace.oid = type.typnamespace where namespace.nspname = 'public' order by type.typname, enum.enumsortorder");
      const constraints = await client.query<{ table_name: string; conname: string; contype: string }>("select cls.relname as table_name, con.conname, con.contype from pg_constraint con join pg_class cls on cls.oid = con.conrelid join pg_namespace namespace on namespace.oid = cls.relnamespace where namespace.nspname = 'public' and cls.relname = any($1::text[]) order by cls.relname, con.conname", [expectedTableNames]);
      const indexes = await client.query<{ index_name: string }>("select index_class.relname as index_name from pg_index index_definition join pg_class table_class on table_class.oid = index_definition.indrelid join pg_namespace namespace on namespace.oid = table_class.relnamespace join pg_class index_class on index_class.oid = index_definition.indexrelid left join pg_constraint con on con.conindid = index_definition.indexrelid where namespace.nspname = 'public' and table_class.relname = any($1::text[]) and con.oid is null order by index_class.relname", [expectedTableNames]);
      const routeConstraint = await client.query<{ conname: string; definition: string }>("select conname, pg_get_constraintdef(oid, true) as definition from pg_constraint where conrelid='request_idempotency'::regclass and conname like 'request_idempotency_route_check%' order by conname");
      expect(tables.rows.map((row) => row.table_name)).toEqual(expectedTableNames);
      expect(enums.rows.map((row) => `${row.enum_name}|${row.enum_value}`)).toEqual(expectedEnumValues);
      expect(constraints.rows.map((row) => `${row.table_name}:${row.conname}:${row.contype}`)).toEqual(expectedConstraints);
      expect(indexes.rows.map((row) => row.index_name)).toEqual(expectedApplicationIndexes);
      expect(routeConstraint.rows).toHaveLength(1);
      expect(routeConstraint.rows[0]?.conname).toBe("request_idempotency_route_check");
      expect(routeConstraint.rows[0]?.definition).not.toContain("/api/internal/bootstrap-claims/redeem");
      await expectConstraintFailure(() => client.query("insert into request_idempotency (route, principal, idempotency_key, request_digest, locked_until, expires_at) values ('/api/internal/bootstrap-claims/redeem', 'migration-principal', 'migration-route-key', $1, now() + interval '2 minutes', now() + interval '1 day')", ["a".repeat(64)]), "request_idempotency_route_check");
      await expectConstraintFailure(() => client.query("insert into request_idempotency (route, principal, idempotency_key, request_digest, locked_until, expires_at) values ('/api/internal/not-a-route', 'migration-principal', 'migration-bad-key', $1, now() + interval '2 minutes', now() + interval '1 day')", ["b".repeat(64)]), "request_idempotency_route_check");
      const metadata = { redemption_id: "b0000000-b000-4000-8000-000000000002", subject: "migration_subject-1", entitlement: "c0000000-c000-4000-8000-000000000003", product: "tester" };
      await client.query("insert into bootstrap_claim_redemptions (principal, idempotency_key, request_digest, response_status, response_metadata, expires_at) values ('agentkip-control-plane', 'migration-redeem-key', $1, 200, $2::jsonb, now() + interval '1 day')", ["c".repeat(64), JSON.stringify(metadata)]);
      await expectConstraintFailure(() => client.query("insert into bootstrap_claim_redemptions (principal, idempotency_key, request_digest, response_status, response_metadata, expires_at) values ('other-principal', 'migration-other-key', $1, 200, $2::jsonb, now() + interval '1 day')", ["d".repeat(64), JSON.stringify(metadata)]), "bootstrap_claim_redemptions_principal_check");
      await expectConstraintFailure(() => client.query("insert into bootstrap_claim_redemptions (principal, idempotency_key, request_digest, response_status, response_metadata, expires_at) values ('agentkip-control-plane', 'migration-unsafe-key', $1, 200, $2::jsonb, now() + interval '1 day')", ["e".repeat(64), JSON.stringify({ ...metadata, claim: "forbidden" })]), "bootstrap_claim_redemptions_metadata_check");
    } finally {
      await client.end();
    }
  }, 30_000);

  it("preserves representative current-site columns, constraints, rows, and sequences", async () => {
    const client = await createClient();
    try {
      await executeScript(client, "tests/fixtures/representative-site-schema.sql");
      const before = await readRepresentativeState(client);
      expect(before).toEqual(expectedRepresentativeState);
      await applyMigrations(client);
      const after = await readRepresentativeState(client);
      expect(after).toEqual(before);
    } finally {
      await client.end();
    }
  }, 30_000);
});

describe("W1 forward constraint repair", () => {
  it("uses the canonical migrator on an empty database and records all four migrations", async () => {
    const client = await createClient();
    try {
      await applyCanonicalMigrations(client);
      expect((await readLedger(client)).rows.map((row) => Number(row.created_at))).toEqual([1783951023454, 1783951023728, 1783958463468, 1784236425806]);
    } finally {
      await client.end();
    }
  }, 30_000);

  it("applies 0002 and 0003 through the canonical migrator after recorded 0001 and preserves seeded rows", async () => {
    const client = await createClient();
    try {
      await applyImmutableMigrations(client);
      await recordMigrationsThrough0001(client);
      const dependency = await seedClaimDependencies(client, 901);
      await client.query(
        "insert into bootstrap_claims (id, entitlement_id, clerk_subject, product, claim_hash, pepper_version, status, expires_at) values ('10000000-0000-4000-8000-000000000901', $1, $2, 'agentkip_first_friend', $3, 1, 'active', now() + interval '15 minutes')",
        [dependency.entitlementId, dependency.subject, "b".repeat(64)],
      );
      const before = await client.query("select * from stripe_events order by stripe_event_id");
      const claimsBefore = await client.query("select * from bootstrap_claims order by id");
      await applyCanonicalMigrations(client);
      expect((await readLedger(client)).rows.map((row) => Number(row.created_at))).toEqual([1783951023454, 1783951023728, 1783958463468, 1784236425806]);
      expect((await client.query("select * from stripe_events order by stripe_event_id")).rows).toEqual(before.rows);
      expect((await client.query("select * from bootstrap_claims order by id")).rows).toEqual(claimsBefore.rows);
      const constraints = await readConstraintDefinitions(client, ["bootstrap_claims_lifecycle_check", "bootstrap_claims_revoke_reason_check"]);
      expect(constraints.map((row) => row.conname)).toEqual(["bootstrap_claims_lifecycle_check", "bootstrap_claims_revoke_reason_check"]);
    } finally {
      await client.end();
    }
  }, 30_000);

  it("rolls back both tables and the ledger when a pre-0002 claim violates the repaired lifecycle check", async () => {
    const client = await createClient();
    try {
      await applyImmutableMigrations(client);
      await recordMigrationsThrough0001(client);
      const dependency = await seedClaimDependencies(client, 902);
      await client.query(
        "insert into bootstrap_claims (id, entitlement_id, clerk_subject, product, claim_hash, pepper_version, status, expires_at, revoke_reason) values ('10000000-0000-4000-8000-000000000902', $1, $2, 'agentkip_first_friend', $3, 1, 'active', now() + interval '15 minutes', 'delivery_uncertain')",
        [dependency.entitlementId, dependency.subject, "c".repeat(64)],
      );
      const before = await readAtomicRollbackState(client);
      try {
        await applyCanonicalMigrations(client);
        throw new Error("expected 0002 migration to fail");
      } catch (error) {
        expect(error).toBeInstanceOf(DrizzleQueryError);
        const pgError = (error as DrizzleQueryError).cause as DatabaseError | undefined;
        expect(pgError?.code).toBe("23514");
        expect(pgError?.constraint).toBe("bootstrap_claims_lifecycle_check");
      }
      expect(await readAtomicRollbackState(client)).toEqual(before);
    } finally {
      await client.end();
    }
  }, 30_000);

  it("accepts the full Stripe event syntax matrix and rejects malformed or oversized types", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const positiveTypes = [
        "v1.billing.meter.error_report_triggered",
        "v2.core.event_destination.ping",
        "billing_portal.configuration.created",
        "v2.core.account[configuration.customer].updated",
      ];
      for (const [index, eventType] of positiveTypes.entries()) {
        const eventId = `evt_positive_${index}`;
        await client.query("insert into stripe_events (stripe_event_id, event_type, event_created_at, status, attempt_count, processed_at) values ($1, $2, now(), 'ignored', 0, now())", [eventId, eventType]);
        expect((await client.query("select event_type, status from stripe_events where stripe_event_id = $1", [eventId])).rows).toEqual([{ event_type: eventType, status: "ignored" }]);
      }
      const negativeTypes = [
        "V1.billing.meter.error_report_triggered",
        "v1..billing",
        "v1.billing-meter.created",
        "v1.core.account[configuration.customer.updated",
        "v1.core.account[].updated",
        "v1",
        `a.${"b".repeat(127)}`,
      ];
      for (const [index, eventType] of negativeTypes.entries()) {
        const eventId = `evt_negative_${index}`;
        await expectConstraintFailure(
          () => client.query("insert into stripe_events (stripe_event_id, event_type, event_created_at, status, attempt_count, processed_at) values ($1, $2, now(), 'ignored', 0, now())", [eventId, eventType]),
          "stripe_events_type_check",
        );
        expect((await client.query("select count(*)::int as count from stripe_events where stripe_event_id = $1", [eventId])).rows).toEqual([{ count: 0 }]);
      }
    } finally {
      await client.end();
    }
  }, 30_000);

  it("enforces bootstrap revoke-reason and lifecycle matrices", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const positiveCases: Array<["active" | "expired" | "consumed" | "revoked", string | null]> = [
        ["active", null],
        ["expired", null],
        ["consumed", null],
        ["revoked", "delivery_uncertain"],
        ["revoked", "entitlement_inactive"],
      ];
      for (const [index, [status, reason]] of positiveCases.entries()) {
        const claim = await insertClaim(client, 1000 + index, status, reason);
        expect((await client.query("select status, revoke_reason from bootstrap_claims where id = $1", [claim.id])).rows).toEqual([{ status, revoke_reason: reason }]);
      }
      const negativeCases: Array<["active" | "expired" | "consumed" | "revoked", string | null, string | undefined]> = [
        ["revoked", "operator_override", "bootstrap_claims_revoke_reason_check"],
        ["active", "delivery_uncertain", "bootstrap_claims_lifecycle_check"],
        ["expired", "entitlement_inactive", "bootstrap_claims_lifecycle_check"],
        ["consumed", "delivery_uncertain", "bootstrap_claims_lifecycle_check"],
        ["revoked", null, "bootstrap_claims_lifecycle_check"],
        ["active", "operator_override", undefined],
      ];
      for (const [index, [status, reason, constraint]] of negativeCases.entries()) {
        const suffix = 2000 + index;
        await expectConstraintFailure(() => insertClaim(client, suffix, status, reason), constraint);
        const id = `10000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
        expect((await client.query("select count(*)::int as count from bootstrap_claims where id = $1", [id])).rows).toEqual([{ count: 0 }]);
      }
    } finally {
      await client.end();
    }
  }, 30_000);
});

describe("W1 remaining transactional contract", () => {
  it("retains the disposable PostgreSQL lane for remaining W1 repository work", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const rows = await client.query<{ count: number }>("select count(*)::int as count from request_idempotency");
      expect(rows.rows).toEqual([{ count: 0 }]);
    } finally {
      await client.end();
    }
  }, 30_000);
});

const c2Port = (client: Client): import("@/lib/w1/db").W1DatabasePort => {
  const database = drizzle(client);
  return {
    transaction: (work) => database.transaction((tx) => work(tx)),
    close: async () => {},
  };
};

const secondClientFor = async (client: Client) => {
  const { host, port, user, password, database } = client;
  const second = new Client({ host, port, user, password, database });
  await second.connect();
  return second;
};

describe("W1 C2 production idempotency repository", () => {
  const route = "/api/billing/checkout" as const;
  const principal = "c2-principal";
  const key = "c2-key-key";
  const digest = "d".repeat(64);
  const now = new Date("2026-07-13T00:00:00.000Z");
  const fixtureNow = async (client: Client) => {
    const result = await client.query<{ fixture_now: Date }>("select date_trunc('second', clock_timestamp()) + interval '5 minutes' as fixture_now");
    if (result.rows.length !== 1 || Object.keys(result.rows[0] ?? {}).length !== 1 || !(result.rows[0]?.fixture_now instanceof Date) || !Number.isFinite(result.rows[0].fixture_now.getTime()) || result.rows[0].fixture_now.getMilliseconds() !== 0) throw new Error("invalid PostgreSQL fixture clock");
    return new Date(result.rows[0].fixture_now.getTime());
  };

  it("drives reservation, completion, replay, cleanup, and corrupt JSONB rejection through production code", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const now = await fixtureNow(client);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const repository = createW1Repository(c2Port(client));
      const services = createW1Services({ repository, clock: { now: () => now } });
      const reserved = await services.preflightIdempotency(principal, route, key, digest);
      expect(reserved.kind).toBe("reserved");
      if (reserved.kind !== "reserved") throw new Error("reservation missing");
      const before = await client.query<{ updated_at: Date }>("select updated_at from request_idempotency where id = $1", [reserved.id]);
      await repository.transaction((tx) => tx.completeIdempotency(reserved.id, route, 200, { checkoutUrl: "https://checkout.stripe.com/c/pay/test?opaque=yes#fragment", expiresAt: "2026-07-14T00:00:00.000Z" }));
      const persisted = await client.query<{ status: string; response_status: number; response_metadata: { checkoutUrl: string }; locked_until: Date | null; updated_at: Date }>("select status, response_status, response_metadata, locked_until, updated_at from request_idempotency where id = $1", [reserved.id]);
      expect(persisted.rows[0]).toMatchObject({ status: "completed", response_status: 200, response_metadata: { checkoutUrl: "https://checkout.stripe.com/c/pay/test?opaque=yes#fragment" }, locked_until: null });
      expect(persisted.rows[0].updated_at.getTime()).toBeGreaterThanOrEqual(before.rows[0].updated_at.getTime());
      await expect(repository.transaction((tx) => tx.completeIdempotency(reserved.id, route, 200, { checkoutUrl: "https://checkout.stripe.com/c/pay/test", expiresAt: "2026-07-14T00:00:00.000Z" }))).rejects.toThrow();
      expect(await services.inspectIdempotency(principal, route, key, digest)).toEqual({ checkoutUrl: "https://checkout.stripe.com/c/pay/test?opaque=yes#fragment", expiresAt: "2026-07-14T00:00:00.000Z" });
      const expiredCreatedAt = new Date(now.getTime() - 120_000);
      const expiredExpiresAt = new Date(now.getTime() - 60_000);
      await client.query("insert into request_idempotency (route, principal, idempotency_key, request_digest, locked_until, expires_at, created_at) values ($1, $2, $3, $4, $5, $6, $5)", [route, "expired-principal", key, digest, expiredCreatedAt, expiredExpiresAt]);
      await repository.cleanupExpiredProcessingIdempotency(now);
      expect((await client.query("select count(*)::int as count from request_idempotency where principal = $1", ["expired-principal"])).rows).toEqual([{ count: 0 }]);
      for (const metadata of [false, 0, "", null, [], { claim_id: "wrong" }]) {
        await client.query("update request_idempotency set response_metadata = $1::jsonb where id = $2", [JSON.stringify(metadata), reserved.id]);
        await expect(repository.transaction((tx) => tx.readIdempotency(route, principal, key))).rejects.toThrow();
      }
    } finally {
      await client.end();
    }
  }, 30_000);

  it("completes and replays every route with production epoch decoding", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const now = await fixtureNow(client);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const repository = createW1Repository(c2Port(client));
      const services = createW1Services({ repository, clock: { now: () => now } });
      const claimId = "a0000000-a000-4000-8000-000000000001";
      const expiration = "2026-07-14T00:00:00.000Z";
      const recovery = { claim_id: claimId, status: "active" as const, expires_at: expiration, replayable: false as const, revoke_path: `/api/bootstrap-claims/${claimId}/revoke`, reissue_path: `/api/bootstrap-claims/${claimId}/reissue` };
      const revoked = { claim_id: claimId, status: "revoked" as const, expires_at: expiration, replayable: false as const, reissue_path: `/api/bootstrap-claims/${claimId}/reissue` };
      const cases = [
        ["/api/billing/checkout", 200, { checkoutUrl: "https://checkout.stripe.com/c/pay/test?opaque=yes#fragment", expiresAt: expiration }],
        ["/api/bootstrap-claims", 201, recovery],
        ["/api/bootstrap-claims/[claim_id]/reissue", 201, recovery],
        ["/api/bootstrap-claims/[claim_id]/revoke", 200, revoked],
      ] as const;
      for (const [routeCase, responseStatus, metadata] of cases) {
        const subject = `route-${responseStatus}-${routeCase}`;
        const response = await services.preflightIdempotency(subject, routeCase, key, digest);
        expect(response.kind).toBe("reserved");
        if (response.kind !== "reserved") throw new Error("route reservation missing");
        const before = await client.query<{ updated_at: Date }>("select updated_at from request_idempotency where id = $1", [response.id]);
        await repository.transaction((tx) => tx.completeIdempotency(response.id, routeCase, responseStatus, metadata));
        expect(await services.inspectIdempotency(subject, routeCase, key, digest)).toEqual(metadata);
        const persisted = await client.query<{ id: string; status: string; response_status: number; locked_until: Date | null; updated_at: Date; response_metadata: unknown }>("select id, status, response_status, locked_until, updated_at, response_metadata from request_idempotency where id = $1", [response.id]);
        expect(persisted.rows).toMatchObject([{ id: response.id, status: "completed", response_status: responseStatus, locked_until: null }]);
        expect(persisted.rows[0].updated_at.getTime()).toBeGreaterThan(before.rows[0].updated_at.getTime());
        const completedSnapshot = await client.query("select id, route, principal, idempotency_key, request_digest, status, response_status, response_metadata, locked_until, expires_at, updated_at from request_idempotency where id = $1", [response.id]);
        await expect(repository.transaction((tx) => tx.completeIdempotency(response.id, routeCase, responseStatus, metadata))).rejects.toThrow("idempotency completion did not update exactly one processing row");
        expect(await client.query("select id, route, principal, idempotency_key, request_digest, status, response_status, response_metadata, locked_until, expires_at, updated_at from request_idempotency where id = $1", [response.id])).toEqual(completedSnapshot);
        const wrongRouteMetadata = routeCase === "/api/billing/checkout"
          ? { claim_id: claimId, status: "active", expires_at: expiration, replayable: false, revoke_path: `/api/bootstrap-claims/${claimId}/revoke`, reissue_path: `/api/bootstrap-claims/${claimId}/reissue` }
          : routeCase === "/api/bootstrap-claims/[claim_id]/revoke"
            ? { claim_id: claimId, status: "active", expires_at: expiration, replayable: false, revoke_path: `/api/bootstrap-claims/${claimId}/revoke`, reissue_path: `/api/bootstrap-claims/${claimId}/reissue` }
            : { claim_id: claimId, status: "revoked", expires_at: expiration, replayable: false, reissue_path: `/api/bootstrap-claims/${claimId}/reissue` };
        for (const corrupt of [false, 0, "", null, [], { wrong: "route" }, wrongRouteMetadata, { ...metadata, status: "wrong" }]) {
          await client.query("update request_idempotency set response_metadata = $1::jsonb where id = $2", [JSON.stringify(corrupt), response.id]);
          await expect(repository.transaction((tx) => tx.readIdempotency(routeCase, subject, key))).rejects.toThrow();
          await client.query("update request_idempotency set response_status = $1, response_metadata = $2::jsonb where id = $3", [responseStatus, JSON.stringify(metadata), response.id]);
        }
        await client.query("update request_idempotency set response_status = $1, response_metadata = $2::jsonb where id = $3", [responseStatus + 1, JSON.stringify(metadata), response.id]);
        await expect(repository.transaction((tx) => tx.readIdempotency(routeCase, subject, key))).rejects.toThrow();
        await client.query("update request_idempotency set response_status = $1, response_metadata = $2::jsonb where id = $3", [responseStatus, JSON.stringify(metadata), response.id]);
      }
    } finally {
      await client.end();
    }
  }, 30_000);

  it("uses production reads for finite epoch dates, digest conflicts, live leases, stale reacquisition, and cleanup isolation", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const now = await fixtureNow(client);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const repository = createW1Repository(c2Port(client));
      const services = createW1Services({ repository, clock: { now: () => now } });
      const first = await services.preflightIdempotency("lifecycle", route, key, digest);
      if (first.kind !== "reserved") throw new Error("new reservation missing");
      const raw = await repository.transaction((tx) => tx.readIdempotency(route, "lifecycle", key));
      expect(raw?.lockedUntil).toBeInstanceOf(Date);
      expect(raw?.expiresAt).toBeInstanceOf(Date);
      expect(raw?.lockedUntil?.getTime()).toBe(now.getTime() + 120_000);
      expect(raw?.expiresAt.getTime()).toBe(now.getTime() + 86_400_000);
      await expect(services.preflightIdempotency("lifecycle", route, key, "e".repeat(64))).rejects.toMatchObject({ code: "idempotency_conflict" });
      await expect(services.preflightIdempotency("lifecycle", route, key, digest)).rejects.toMatchObject({ code: "request_in_progress", retryAfter: 2 });
      await client.query("update request_idempotency set locked_until = $1 where id = $2", [new Date(now.getTime() - 1_000), first.id]);
      const stale = await services.preflightIdempotency("lifecycle", route, key, digest);
      expect(stale).toEqual({ kind: "reserved", id: first.id });
      const core = repository;
      const cleanupFailureRepository = {
        transaction: core.transaction,
        cleanupExpiredProcessingIdempotency: async () => { throw new Error("cleanup arrangement failure"); },
        readEntitlement: core.readEntitlement,
        close: core.close,
      };
      const cleanupContinues = createW1Services({ repository: cleanupFailureRepository, clock: { now: () => now } });
      await expect(cleanupContinues.preflightIdempotency("cleanup-continues", route, key, digest)).resolves.toMatchObject({ kind: "reserved" });
    } finally {
      await client.end();
    }
  }, 30_000);

  it("exhaustively rejects malformed idempotency metadata and raw rows without invoking accessors", async () => {
    const { decodeIdempotencyRecord, validateResponseMetadata } = await import("@/lib/w1/idempotency");
    const claimId = "a0000000-a000-4000-8000-000000000001";
    const expiration = "2026-07-14T00:00:00.000Z";
    const checkout = { checkoutUrl: "https://checkout.stripe.com/c/pay/c2rg?opaque=1#fragment", expiresAt: expiration };
    const recovery = { claim_id: claimId, status: "active", expires_at: expiration, replayable: false, revoke_path: `/api/bootstrap-claims/${claimId}/revoke`, reissue_path: `/api/bootstrap-claims/${claimId}/reissue` };
    const revoked = { claim_id: claimId, status: "revoked", expires_at: expiration, replayable: false, reissue_path: `/api/bootstrap-claims/${claimId}/reissue` };
    const metadataCases = [
      ["/api/billing/checkout", checkout],
      ["/api/bootstrap-claims", recovery],
      ["/api/bootstrap-claims/[claim_id]/reissue", recovery],
      ["/api/bootstrap-claims/[claim_id]/revoke", revoked],
    ] as const;
    for (const [sourceRoute, metadata] of metadataCases) {
      for (const field of Object.keys(metadata)) {
        let getterCalls = 0;
        const accessor = { ...metadata };
        Object.defineProperty(accessor, field, { enumerable: true, get: () => { getterCalls += 1; return metadata[field as keyof typeof metadata]; } });
        expect(() => validateResponseMetadata(sourceRoute, accessor)).toThrow("invalid response metadata");
        expect(getterCalls).toBe(0);
      }
      for (const [targetRoute] of metadataCases) {
        const sourceIsIssue = sourceRoute === "/api/bootstrap-claims" || sourceRoute === "/api/bootstrap-claims/[claim_id]/reissue";
        const targetIsIssue = targetRoute === "/api/bootstrap-claims" || targetRoute === "/api/bootstrap-claims/[claim_id]/reissue";
        const compatible = sourceRoute === targetRoute || (sourceIsIssue && targetIsIssue);
        if (compatible) expect(validateResponseMetadata(targetRoute, metadata)).toEqual(metadata);
        else expect(() => validateResponseMetadata(targetRoute, metadata)).toThrow("invalid response metadata");
      }
      for (const sensitive of ["claim", "claim_hash", "token", "secret", "password", "authorization"]) expect(() => validateResponseMetadata(sourceRoute, { ...metadata, [sensitive]: "redacted" })).toThrow();
      const dateField = sourceRoute === "/api/billing/checkout" ? "expiresAt" : "expires_at";
      for (const invalidDate of ["2026-07-14T00:00:00Z", "2026-07-14T00:00:00.000+00:00", "2026-02-30T00:00:00.000Z", "2026-07-14T00:00:00.0000Z", " 2026-07-14T00:00:00.000Z", 1]) {
        expect(() => validateResponseMetadata(sourceRoute, { ...metadata, [dateField]: invalidDate })).toThrow();
      }
      if (sourceRoute !== "/api/billing/checkout") {
        for (const pathField of sourceRoute === "/api/bootstrap-claims/[claim_id]/revoke" ? ["reissue_path"] : ["reissue_path", "revoke_path"]) {
          const terminal = pathField === "reissue_path" ? "reissue" : "revoke";
          const otherTerminal = terminal === "reissue" ? "revoke" : "reissue";
          for (const invalidPath of [
            `/api/bootstrap-claims/b0000000-b000-4000-8000-000000000002/${terminal}`,
            `/api/bootstrap-claims/${claimId}/${otherTerminal}`,
            `/api/bootstrap-claims/${claimId}/${terminal}?x=1`,
            `/api/bootstrap-claims/${claimId}/${terminal}#x`,
            `/api/bootstrap-claims/${claimId}/../${claimId}/${terminal}`,
            `https://agentkip.test/api/bootstrap-claims/${claimId}/${terminal}`,
            `/api/bootstrap-claims/${claimId.replaceAll("-", "%2d")}/${terminal}`,
          ]) expect(() => validateResponseMetadata(sourceRoute, { ...metadata, [pathField]: invalidPath })).toThrow();
        }
      }
    }
    for (const bad of [
      { ...checkout, checkoutUrl: "http://checkout.stripe.com/c/pay/x" }, { ...checkout, checkoutUrl: "https://checkout.stripe.com.evil/c/pay/x" }, { ...checkout, checkoutUrl: "https://user@checkout.stripe.com/c/pay/x" }, { ...checkout, expiresAt: "2026-07-14T00:00:00Z" },
    ]) expect(() => validateResponseMetadata("/api/billing/checkout", bad)).toThrow();
    for (const bad of [{ ...recovery, claim_id: claimId.toUpperCase() }, { ...recovery, revoke_path: `/api/bootstrap-claims/${claimId}/revoke?x=1` }, { ...recovery, reissue_path: `/api/bootstrap-claims/${claimId}/reissue#x` }]) expect(() => validateResponseMetadata("/api/bootstrap-claims", bad)).toThrow();
    expect(() => validateResponseMetadata("/api/bootstrap-claims/[claim_id]/revoke", { ...revoked, status: "active" })).toThrow();

    const raw = (routeCase: (typeof metadataCases)[number][0], status: "processing" | "completed", metadata: unknown = status === "completed" ? metadataCases.find(([candidate]) => candidate === routeCase)?.[1] : null): Record<string, unknown> => ({
      id: claimId, route: routeCase, principal, idempotencyKey: key, requestDigest: digest, status,
      responseStatus: status === "completed" ? (routeCase === "/api/bootstrap-claims" || routeCase === "/api/bootstrap-claims/[claim_id]/reissue" ? 201 : 200) : null,
      responseMetadata: metadata, lockedUntil: status === "processing" ? now.getTime() + 120_000 : null, expiresAt: now.getTime() + 86_400_000,
    });
    const uuidFailures = [claimId.toUpperCase(), "a0000000-a000-1000-8000-000000000001", "a0000000-a000-2000-8000-000000000001", "a0000000-a000-3000-8000-000000000001", "a0000000-a000-5000-8000-000000000001", "a0000000-a000-6000-8000-000000000001", "a0000000-a000-4000-7000-000000000001", claimId.slice(0, -1), `${claimId}0`, `{${claimId}}`, ` ${claimId}`];
    for (const [routeCase] of metadataCases) {
      for (const status of ["processing", "completed"] as const) {
        const valid = raw(routeCase, status);
        const decoded = decodeIdempotencyRecord(valid, { route: routeCase, principal, idempotencyKey: key });
        const decodedAgain = decodeIdempotencyRecord(valid, { route: routeCase, principal, idempotencyKey: key });
        expect(decoded.expiresAt).not.toBe(decodedAgain.expiresAt);
        if (decoded.lockedUntil && decodedAgain.lockedUntil) expect(decoded.lockedUntil).not.toBe(decodedAgain.lockedUntil);
        if (decoded.responseMetadata && decodedAgain.responseMetadata) expect(decoded.responseMetadata).not.toBe(decodedAgain.responseMetadata);
        for (const missing of Object.keys(valid)) { const malformed = { ...valid }; delete malformed[missing]; expect(() => decodeIdempotencyRecord(malformed, { route: routeCase, principal, idempotencyKey: key })).toThrow(); }
        for (const mutation of [
          { ...valid, extra: true }, { ...valid, principal: "other" }, { ...valid, route: "/wrong" }, { ...valid, idempotencyKey: "short" }, { ...valid, requestDigest: "D".repeat(64) }, { ...valid, requestDigest: "d".repeat(63) }, { ...valid, requestDigest: "d".repeat(65) }, { ...valid, requestDigest: 1 }, { ...valid, expiresAt: Infinity }, { ...valid, expiresAt: NaN }, { ...valid, lockedUntil: status === "processing" ? NaN : now.getTime() }, { ...valid, status: "other" },
        ]) expect(() => decodeIdempotencyRecord(mutation, { route: routeCase, principal, idempotencyKey: key })).toThrow();
        for (const invalidKey of ["short", "x".repeat(129), "invalid/key"]) {
          expect(() => decodeIdempotencyRecord({ ...valid, idempotencyKey: invalidKey }, { route: routeCase, principal, idempotencyKey: invalidKey })).toThrow();
        }
        for (const id of uuidFailures) expect(() => decodeIdempotencyRecord({ ...valid, id }, { route: routeCase, principal, idempotencyKey: key })).toThrow();
        const nonEnumerable = { ...valid }; Object.defineProperty(nonEnumerable, "extra", { value: true }); expect(() => decodeIdempotencyRecord(nonEnumerable, { route: routeCase, principal, idempotencyKey: key })).toThrow();
        const hiddenExpected = { ...valid }; Object.defineProperty(hiddenExpected, "id", { enumerable: false, value: claimId }); expect(() => decodeIdempotencyRecord(hiddenExpected, { route: routeCase, principal, idempotencyKey: key })).toThrow();
        const symbolic = { ...valid, [Symbol("c2rg")]: true }; expect(() => decodeIdempotencyRecord(symbolic, { route: routeCase, principal, idempotencyKey: key })).toThrow();
        for (const field of Object.keys(valid)) { let getterCalls = 0; const accessor = { ...valid }; Object.defineProperty(accessor, field, { enumerable: true, get: () => { getterCalls += 1; return valid[field]; } }); expect(() => decodeIdempotencyRecord(accessor, { route: routeCase, principal, idempotencyKey: key })).toThrow(); expect(getterCalls).toBe(0); }
        const populatedNonPlain = Object.assign(Object.create({ inherited: true }), valid);
        for (const malformed of [null, [], 1, Object.create(null), populatedNonPlain]) expect(() => decodeIdempotencyRecord(malformed, { route: routeCase, principal, idempotencyKey: key })).toThrow();
        if (status === "processing") for (const mutation of [{ ...valid, responseStatus: 200 }, { ...valid, responseMetadata: checkout }, { ...valid, lockedUntil: null }]) expect(() => decodeIdempotencyRecord(mutation, { route: routeCase, principal, idempotencyKey: key })).toThrow();
        else for (const mutation of [{ ...valid, responseStatus: null }, { ...valid, responseMetadata: null }, { ...valid, lockedUntil: now.getTime() }, { ...valid, responseStatus: 418 }]) expect(() => decodeIdempotencyRecord(mutation, { route: routeCase, principal, idempotencyKey: key })).toThrow();
      }
    }
  });

  it("holds both real inserts before releasing exactly one winner", async () => {
    const first = await createClient();
    const second = await secondClientFor(first);
    const observer = await secondClientFor(first);
    try {
      await applyMigrations(first);
      const now = await fixtureNow(first);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const arrivals = { first: 0, second: 0 };
      let releaseBarrier: (() => void) | undefined;
      const release = new Promise<void>((resolve) => { releaseBarrier = resolve; });
      let signalFirst: (() => void) | undefined;
      let signalSecond: (() => void) | undefined;
      const firstArrived = new Promise<void>((resolve) => { signalFirst = resolve; });
      const secondArrived = new Promise<void>((resolve) => { signalSecond = resolve; });
      const port = (client: Client, arrival: "first" | "second", signal: () => void) => {
        const database = drizzle(client);
        return {
          transaction: async <T>(work: (tx: import("@/lib/w1/db").W1Transaction) => Promise<T>) => database.transaction(async (core) => {
            let executeCount = 0;
            return work({ execute: async (statement) => {
              executeCount += 1;
              if (executeCount === 2) { arrivals[arrival] += 1; signal(); await release; }
              return core.execute(statement);
            } });
          }),
          close: async () => {},
        };
      };
      if (!signalFirst || !signalSecond || !releaseBarrier) throw new Error("barrier setup failed");
      const one = createW1Services({ repository: createW1Repository(port(first, "first", signalFirst)), clock: { now: () => now } });
      const two = createW1Services({ repository: createW1Repository(port(second, "second", signalSecond)), clock: { now: () => now } });
      const pending = [one.preflightIdempotency("race-principal", route, key, digest), two.preflightIdempotency("race-principal", route, key, digest)];
      await Promise.all([firstArrived, secondArrived]);
      expect(arrivals).toEqual({ first: 1, second: 1 });
      expect((await observer.query("select count(*)::int as count from request_idempotency where principal = $1", ["race-principal"])).rows).toEqual([{ count: 0 }]);
      releaseBarrier();
      const settled = await Promise.allSettled(pending);
      const winners = settled.filter((result) => result.status === "fulfilled");
      const losers = settled.filter((result) => result.status === "rejected");
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);
      expect(winners[0]).toMatchObject({ status: "fulfilled", value: { kind: "reserved" } });
      expect(losers[0]).toMatchObject({ status: "rejected", reason: { code: "request_in_progress", retryAfter: 2 } });
      const winner = winners[0];
      if (!winner || winner.status !== "fulfilled" || winner.value.kind !== "reserved") throw new Error("reserved winner missing");
      const rows = await first.query<{ id: string; request_digest: string; locked_until: Date }>("select id, request_digest, locked_until from request_idempotency where principal = $1", ["race-principal"]);
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0].id).toBe(winner.value.id);
      expect(rows.rows[0].request_digest).toBe(digest);
      expect(rows.rows[0].locked_until.getTime()).toBeGreaterThan(now.getTime());
    } finally {
      await observer.end();
      await second.end();
      await first.end();
    }
  }, 30_000);

  it("proves two-client stale-row reacquisition preserves the row and creates one live lease", async () => {
    const first = await createClient();
    const second = await secondClientFor(first);
    try {
      await applyMigrations(first);
      const now = await fixtureNow(first);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const initial = createW1Services({ repository: createW1Repository(c2Port(first)), clock: { now: () => now } });
      const reservation = await initial.preflightIdempotency("stale-race", route, key, digest);
      if (reservation.kind !== "reserved") throw new Error("initial stale reservation missing");
      await first.query("update request_idempotency set locked_until = $1 where id = $2", [new Date(now.getTime() - 1_000), reservation.id]);
      const one = createW1Services({ repository: createW1Repository(c2Port(first)), clock: { now: () => now } });
      const two = createW1Services({ repository: createW1Repository(c2Port(second)), clock: { now: () => now } });
      const settled = await Promise.allSettled([one.preflightIdempotency("stale-race", route, key, digest), two.preflightIdempotency("stale-race", route, key, digest)]);
      expect(settled.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      expect(settled.filter((result) => result.status === "rejected")).toHaveLength(1);
      expect(settled).toContainEqual(expect.objectContaining({ status: "fulfilled", value: { kind: "reserved", id: reservation.id } }));
      expect(settled).toContainEqual(expect.objectContaining({ status: "rejected", reason: expect.objectContaining({ code: "request_in_progress", retryAfter: 2 }) }));
      const rows = await first.query<{ id: string; request_digest: string; locked_until: Date }>("select id, request_digest, locked_until from request_idempotency where principal = $1", ["stale-race"]);
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]).toMatchObject({ id: reservation.id, request_digest: digest });
      expect(rows.rows[0].locked_until.getTime()).toBeGreaterThan(now.getTime());
    } finally {
      await second.end();
      await first.end();
    }
  }, 30_000);

  it("proves checkout HTTP validation and conflict precedence before provider activity", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const now = await fixtureNow(client);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const { createW1HttpHandlers } = await import("@/lib/w1/http");
      const repository = createW1Repository(c2Port(client));
      const calls = { validate: 0, customer: 0, checkout: 0 };
      const checkoutAuthority = { resolve: () => ({ priceId: "price_c2rg", productId: "prod_c2rg" }) };
      const stripe = {
        validateConfiguredPrice: async (expected: { priceId: string; productId: string }) => { calls.validate += 1; expect(expected).toEqual({ priceId: "price_c2rg", productId: "prod_c2rg" }); },
        createCustomer: async () => { calls.customer += 1; return { customerId: "cus_c2rg", livemode: false as const, deleted: false as const, metadata: { agentkip_schema: "1" as const, clerk_subject: "c2rg-http-subject" } }; },
        createCheckout: async () => { calls.checkout += 1; return { sessionId: "cs_test_c2rg", subscriptionId: "sub_c2rg", customerId: "cus_c2rg", priceId: "price_c2rg", productId: "prod_c2rg", checkoutUrl: "https://checkout.stripe.com/c/pay/c2rg?opaque=1#state", createdAt: new Date(now.getTime()), expiresAt: new Date(now.getTime() + 86_400_000), livemode: false as const, mode: "subscription" as const, quantity: 1 as const, metadata: { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "c2rg-http-subject", checkout_request_id: "unused" } as const, subscriptionMetadata: { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "c2rg-http-subject", checkout_request_id: "unused" } as const }; },
      };
      const scope = { repository, checkoutAuthority, checkoutStripe: stripe, webhookStripe: { verifyWebhook: () => { throw new Error("unused webhook"); }, loadAuthorityBundle: async () => ({ valid: false as const, reference: { sessionId: "", customerId: null, subscriptionId: null } }) }, claimPepper: "c2rg", rateLimitPepper: "c2rg", internalBearer: "c2rg", close: async () => {} };
      const handlers = createW1HttpHandlers({ create: async () => scope }, { subject: async () => "c2rg-http-subject" });
      const invalid = () => new Request("https://agentkip.test/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": "c2rg-http-key" }, body: JSON.stringify({ product: "not-tester" }) });
      const invalidResponse = await handlers.checkout(invalid());
      expect(invalidResponse.status).toBe(422);
      await expect(invalidResponse.json()).resolves.toMatchObject({ error: { code: "invalid_checkout_request" } });
      expect((await client.query("select count(*)::int as count from request_idempotency where principal = $1", ["c2rg-http-subject"])).rows).toEqual([{ count: 0 }]);
      expect((await client.query("select count(*)::int as count from billing_checkout_intents")).rows).toEqual([{ count: 0 }]);
      expect((await client.query("select count(*)::int as count from billing_customers")).rows).toEqual([{ count: 0 }]);
      expect(calls).toEqual({ validate: 0, customer: 0, checkout: 0 });
      const seeded = await createW1Services({ repository, clock: { now: () => now } }).preflightIdempotency("c2rg-http-subject", route, "c2rg-http-key", "a".repeat(64));
      if (seeded.kind !== "reserved") throw new Error("conflict seed missing");
      const before = await client.query("select id, route, principal, idempotency_key, request_digest, status, response_status, response_metadata, locked_until, expires_at, updated_at from request_idempotency where id = $1", [seeded.id]);
      const conflictResponse = await handlers.checkout(invalid());
      expect(conflictResponse.status).toBe(409);
      await expect(conflictResponse.json()).resolves.toMatchObject({ error: { code: "idempotency_conflict" } });
      expect(await client.query("select id, route, principal, idempotency_key, request_digest, status, response_status, response_metadata, locked_until, expires_at, updated_at from request_idempotency where id = $1", [seeded.id])).toEqual(before);
      expect((await client.query("select count(*)::int as count from billing_checkout_intents")).rows).toEqual([{ count: 0 }]);
      expect((await client.query("select count(*)::int as count from billing_customers")).rows).toEqual([{ count: 0 }]);
      expect(calls).toEqual({ validate: 0, customer: 0, checkout: 0 });
    } finally {
      await client.end();
    }
  }, 30_000);

  it("persists deterministic local Stripe checkout and suppresses replay calls", async () => {
    const client = await createClient();
    const observer = await secondClientFor(client);
    try {
      await applyMigrations(client);
      const now = await fixtureNow(client);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const repository = createW1Repository(c2Port(client));
      const calls = { order: [] as string[], validate: 0, customers: [] as string[], checkouts: [] as string[], requestIds: [] as string[] };
      const subject = "c2rf-stripe-subject";
      const checkoutAuthority = { resolve: () => ({ priceId: "price_c2rg", productId: "prod_c2rg" }) };
      const assertCommitted = async (requestId?: string) => {
        const committed = await observer.query<{ id: string; clerk_subject: string; product: string; configured_price_id: string; configured_stripe_product_id: string; status: string }>("select intent.id, intent.clerk_subject, intent.product, intent.configured_price_id, intent.configured_stripe_product_id, request.status from billing_checkout_intents intent join request_idempotency request on request.id = intent.request_idempotency_id where request.route = $1 and request.principal = $2 and request.idempotency_key = $3", [route, subject, "c2rg-stripe-key"]);
        expect(committed.rows).toHaveLength(1);
        expect(committed.rows[0]).toEqual({ id: requestId ?? committed.rows[0].id, clerk_subject: subject, product: "agentkip_first_friend", configured_price_id: "price_c2rg", configured_stripe_product_id: "prod_c2rg", status: "processing" });
      };
      const stripe = {
        validateConfiguredPrice: async (expected: { priceId: string; productId: string }) => { await assertCommitted(); calls.order.push("validate"); calls.validate += 1; expect(expected).toEqual({ priceId: "price_c2rg", productId: "prod_c2rg" }); },
        createCustomer: async (input: { subject: string }, idempotencyKey: string) => { await assertCommitted(); calls.order.push("Customer"); expect(input.subject).toBe(subject); calls.customers.push(idempotencyKey); return { customerId: "cus_c2rg", livemode: false as const, deleted: false as const, metadata: { agentkip_schema: "1" as const, clerk_subject: subject } }; },
        createCheckout: async (input: { customerId: string; subject: string; requestId: string; authority: { priceId: string; productId: string } }, idempotencyKey: string) => { await assertCommitted(input.requestId); calls.order.push("Checkout"); expect(input.subject).toBe(subject); expect(input.authority).toEqual({ priceId: "price_c2rg", productId: "prod_c2rg" }); expect(Object.hasOwn(input, "expiresAt")).toBe(false); calls.checkouts.push(idempotencyKey); calls.requestIds.push(input.requestId); return { sessionId: "cs_test_c2rg", subscriptionId: "sub_c2rg", customerId: input.customerId, priceId: "price_c2rg", productId: "prod_c2rg", checkoutUrl: "https://checkout.stripe.com/c/pay/c2rf?opaque=1#state", createdAt: new Date(now.getTime()), expiresAt: new Date(now.getTime() + 86_400_000), livemode: false as const, mode: "subscription" as const, quantity: 1 as const, metadata: { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: subject, checkout_request_id: input.requestId } as const, subscriptionMetadata: { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: subject, checkout_request_id: input.requestId } as const }; },
      };
      const services = createW1Services({ repository, checkoutAuthority, checkoutStripe: stripe, clock: { now: () => now } });
      const first = await services.checkout(subject, "c2rg-stripe-key", digest);
      const stored = await client.query<{ id: string; request_idempotency_id: string; clerk_subject: string; product: string; configured_price_id: string; configured_stripe_product_id: string; stripe_customer_id: string; stripe_checkout_session_id: string; stripe_subscription_id: string }>("select id, request_idempotency_id, clerk_subject, product, configured_price_id, configured_stripe_product_id, stripe_customer_id, stripe_checkout_session_id, stripe_subscription_id from billing_checkout_intents");
      expect(stored.rows).toHaveLength(1);
      expect(calls.customers).toEqual(["agentkip:w1:customer:79e43153985720fe72a932b080deeadcbc862ea644a4d8e91160e693529dfcb1"]);
      expect(calls.requestIds).toEqual([stored.rows[0].id]);
      expect(calls.checkouts).toEqual([`agentkip:w1:checkout:${stored.rows[0].id}`]);
      expect(stored.rows[0]).toMatchObject({ request_idempotency_id: stored.rows[0].request_idempotency_id, clerk_subject: subject, product: "agentkip_first_friend", configured_price_id: "price_c2rg", configured_stripe_product_id: "prod_c2rg", stripe_customer_id: "cus_c2rg", stripe_checkout_session_id: "cs_test_c2rg", stripe_subscription_id: "sub_c2rg" });
      expect((await client.query("select clerk_subject, stripe_customer_id from billing_customers")).rows).toEqual([{ clerk_subject: "c2rf-stripe-subject", stripe_customer_id: "cus_c2rg" }]);
      expect(first).toEqual({ checkoutUrl: "https://checkout.stripe.com/c/pay/c2rf?opaque=1#state", expiresAt: new Date(now.getTime() + 86_400_000).toISOString() });
      const completed = await client.query<{ response_metadata: { checkoutUrl: string } }>("select response_metadata from request_idempotency where id = $1", [stored.rows[0].request_idempotency_id]);
      expect(completed.rows).toEqual([{ response_metadata: { checkoutUrl: "https://checkout.stripe.com/c/pay/c2rf?opaque=1#state", expiresAt: new Date(now.getTime() + 86_400_000).toISOString() } }]);
      const intentBeforeReplay = stored.rows[0];
      const replay = await services.checkout(subject, "c2rg-stripe-key", digest);
      expect(replay).toEqual(first);
      expect((await client.query("select id, request_idempotency_id, clerk_subject, product, configured_price_id, configured_stripe_product_id, stripe_customer_id, stripe_checkout_session_id, stripe_subscription_id from billing_checkout_intents")).rows).toEqual([intentBeforeReplay]);
      expect((await client.query("select count(*)::int as count from billing_checkout_intents")).rows).toEqual([{ count: 1 }]);
      expect((await client.query("select count(*)::int as count from billing_customers")).rows).toEqual([{ count: 1 }]);
      expect((await client.query("select count(*)::int as count from request_idempotency")).rows).toEqual([{ count: 1 }]);
      expect(calls).toEqual({ order: ["validate", "Customer", "Checkout"], validate: 1, customers: ["agentkip:w1:customer:79e43153985720fe72a932b080deeadcbc862ea644a4d8e91160e693529dfcb1"], checkouts: [`agentkip:w1:checkout:${stored.rows[0].id}`], requestIds: [stored.rows[0].id] });
    } finally {
      await observer.end();
      await client.end();
    }
  }, 30_000);

  it("reports an unresolved reservation when a disposable trigger suppresses the real insert", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      await client.query("create function c2re_suppress_idempotency_insert() returns trigger language plpgsql as $$ begin return null; end $$");
      await client.query("create trigger c2re_suppress_idempotency_insert before insert on request_idempotency for each row execute function c2re_suppress_idempotency_insert()");
      const services = createW1Services({ repository: createW1Repository(c2Port(client)), clock: { now: () => now } });
      await expect(services.preflightIdempotency("suppressed", route, key, digest)).rejects.toThrow("idempotency reservation did not resolve");
      expect((await client.query("select count(*)::int as count from request_idempotency where principal = $1", ["suppressed"])).rows).toEqual([{ count: 0 }]);
    } finally {
      await client.query("drop trigger if exists c2re_suppress_idempotency_insert on request_idempotency");
      await client.query("drop function if exists c2re_suppress_idempotency_insert()");
      await client.end();
    }
  }, 30_000);
});
// C2_PROOF_REBASELINE_END

describe("W1 C3 provider-default Checkout expiry contract", () => {
  it("persists only the exact provider-created 24-hour expiry with a fractional request clock", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const fixture = await client.query<{ fixture_now: Date }>("select date_trunc('second', clock_timestamp()) + interval '5 minutes' as fixture_now");
      const createdAt = fixture.rows[0]?.fixture_now;
      if (!(createdAt instanceof Date) || createdAt.getMilliseconds() !== 0) throw new Error("fixture clock missing");
      const expiresAt = new Date(createdAt.getTime() + 86_400_000);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const calls = { validate: 0, customer: 0, checkout: 0, key: "" };
      const stripe = {
        validateConfiguredPrice: async (authority: { priceId: string; productId: string }) => { calls.validate += 1; expect(authority).toEqual({ priceId: "price_c3r1r2", productId: "prod_c3r1r2" }); },
        createCustomer: async (input: { subject: string }) => { calls.customer += 1; return { customerId: "cus_c3r1r2", livemode: false as const, deleted: false as const, metadata: { agentkip_schema: "1" as const, clerk_subject: input.subject } }; },
        createCheckout: async (input: { customerId: string; subject: string; requestId: string; authority: { priceId: string; productId: string } }, key: string) => {
          calls.checkout += 1;
          calls.key = key;
          expect(Object.keys(input).sort()).toEqual(["authority", "customerId", "requestId", "subject"]);
          return { sessionId: "cs_test_c3r1r2", subscriptionId: "sub_c3r1r2", customerId: input.customerId, priceId: input.authority.priceId, productId: input.authority.productId, checkoutUrl: "https://checkout.stripe.com/c/pay/c3r1r2?opaque=1#state", createdAt: new Date(createdAt.getTime()), expiresAt: new Date(expiresAt.getTime()), livemode: false as const, mode: "subscription" as const, quantity: 1 as const, metadata: { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: input.subject, checkout_request_id: input.requestId } as const, subscriptionMetadata: { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: input.subject, checkout_request_id: input.requestId } as const };
        },
      };
      const services = createW1Services({ repository: createW1Repository(c2Port(client)), checkoutAuthority: { resolve: () => ({ priceId: "price_c3r1r2", productId: "prod_c3r1r2" }) }, checkoutStripe: stripe, clock: { now: () => new Date(createdAt.getTime() + 123) } });
      const first = await services.checkout("c3r1r2-subject", "c3r1r2-key", "c".repeat(64));
      expect(first.expiresAt).toBe(expiresAt.toISOString());
      const replay = await services.checkout("c3r1r2-subject", "c3r1r2-key", "c".repeat(64));
      expect(replay).toEqual(first);
      expect(calls).toMatchObject({ validate: 1, customer: 1, checkout: 1 });
      expect(calls.key).toMatch(/^agentkip:w1:checkout:/);
    } finally {
      await client.end();
    }
  }, 30_000);
});

import type { W1DatabasePort } from "@/lib/w1/db";
import type { W1Repository, W1RepositoryTx } from "@/lib/w1/repository";
import type { StripeCheckoutPort, StripeCheckoutResult } from "@/lib/w1/stripe";
import type { W1CheckoutConfig } from "@/lib/w1/config";

const c3rem4Authority = { priceId: "price_c3rem4", productId: "prod_c3rem4" };
const c3rem4Now = async (client: Client) => {
  const result = await client.query<{ fixture_now: Date }>("select date_trunc('second', clock_timestamp()) + interval '5 minutes' as fixture_now");
  const value = result.rows[0]?.fixture_now;
  if (!(value instanceof Date) || !Number.isFinite(value.getTime()) || value.getMilliseconds() !== 0) throw new Error("invalid C3REM4 fixture clock");
  return new Date(value.getTime());
};
const c3rem4Result = (input: Parameters<StripeCheckoutPort["createCheckout"]>[0], customerId: string, createdAt: Date, expiresAt: Date): StripeCheckoutResult => ({
  sessionId: "cs_test_c3rem4", subscriptionId: "sub_c3rem4", customerId, priceId: input.authority.priceId, productId: input.authority.productId,
  checkoutUrl: "https://checkout.stripe.com/c/pay/c3rem4?proof=1#state", createdAt, expiresAt, livemode: false, mode: "subscription", quantity: 1,
  metadata: { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: input.subject, checkout_request_id: input.requestId },
  subscriptionMetadata: { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: input.subject, checkout_request_id: input.requestId },
});
const c3rem4CheckoutPort = (customerId: string, createdAt: Date, expiresAt: Date, calls: { customer: number; checkout: number; order?: string[]; advisory?: () => boolean }): StripeCheckoutPort => ({
  validateConfiguredPrice: async (authority) => { expect(authority).toEqual(c3rem4Authority); },
  createCustomer: async ({ subject }) => {
    calls.customer += 1;
    if (calls.order && calls.advisory?.()) calls.order.push("createCustomer");
    return { customerId, livemode: false, deleted: false, metadata: { agentkip_schema: "1", clerk_subject: subject } };
  },
  createCheckout: async (input) => {
    calls.checkout += 1;
    return c3rem4Result(input, customerId, createdAt, expiresAt);
  },
});

describe("W1 C3REM4 bounded Checkout behavioral evidence", () => {
  it("drives exact repository decoders for underscore events and Customer mappings", async () => {
    const { createW1Repository } = await import("@/lib/w1/repository");
    const portFor = (row: Record<string | symbol, unknown>): W1DatabasePort => ({
      transaction: async (work) => work({ execute: async () => ({ rows: [row] }) }),
      close: async () => {},
    });
    const subject = "c3rem4-decoder";
    const entitlement = {
      id: "40000000-0000-4000-8000-000000000001", clerkSubject: subject, product: "agentkip_first_friend", status: "active", source: "stripe_subscription",
      grantedAt: new Date("2026-07-13T00:00:00.000Z").getTime(), revokedAt: null, updatedAt: new Date("2026-07-13T00:00:00.000Z").getTime(), stripeCustomerId: "cus_c3rem4",
      stripeCheckoutSessionId: null, stripeSubscriptionId: "sub_c3rem4", lastEventCreatedAt: new Date("2026-07-13T00:00:00.000Z").getTime(), lastEventPrecedence: 100,
      lastStripeEventId: "evt_c3rem4_event_with_underscores",
    };
    const customer = { clerkSubject: subject, stripeCustomerId: "cus_c3rem4" };
    await expect(createW1Repository(portFor(entitlement)).transaction((tx) => tx.readEntitlement(subject))).resolves.toMatchObject({ lastStripeEventId: entitlement.lastStripeEventId });
    await expect(createW1Repository(portFor({ ...entitlement, lastStripeEventId: "evt-c3rem4" })).transaction((tx) => tx.readEntitlement(subject))).rejects.toThrow();
    await expect(createW1Repository(portFor(customer)).transaction((tx) => tx.readCustomer(subject))).resolves.toEqual(customer);
    await expect(createW1Repository(portFor({ ...customer, extra: true })).transaction((tx) => tx.readCustomer(subject))).rejects.toThrow();
    let accessorCalls = 0;
    const accessor = { clerkSubject: subject, stripeCustomerId: "cus_c3rem4" };
    Object.defineProperty(accessor, "stripeCustomerId", { enumerable: true, get: () => { accessorCalls += 1; return "cus_c3rem4"; } });
    await expect(createW1Repository(portFor(accessor)).transaction((tx) => tx.readCustomer(subject))).rejects.toThrow();
    expect(accessorCalls).toBe(0);
  });

  it("persists a validated Customer reread, normalized Checkout, and conflict replay boundary", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const now = await c3rem4Now(client);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const repository = createW1Repository(c2Port(client));
      const order: string[] = [];
      let advisory = false;
      let customerReads = 0;
      let rereadCustomerId: string | null = null;
      let createdCustomerId: string | null = null;
      const observed: W1Repository = {
        ...repository,
        transaction: async <T>(work: (tx: W1RepositoryTx) => Promise<T>) => repository.transaction(async (tx) => {
          const watched: W1RepositoryTx = {
            ...tx,
            acquireAdvisoryLock: async (lock) => { await tx.acquireAdvisoryLock(lock); advisory = lock.startsWith("customer:"); },
            readCustomer: async (subject) => {
              const mapping = await tx.readCustomer(subject);
              if (advisory) {
                order.push("readCustomer");
                customerReads += 1;
                if (customerReads === 2) rereadCustomerId = mapping?.stripeCustomerId ?? null;
              }
              return mapping;
            },
            insertCustomer: async (subject, customerId) => { if (advisory) order.push("insertCustomer"); return tx.insertCustomer(subject, customerId); },
            setIntentCustomer: async (id, customerId) => {
              if (advisory) {
                order.push("setIntentCustomer");
                expect(rereadCustomerId).toBe(createdCustomerId);
                expect(customerId).toBe(createdCustomerId);
              }
              return tx.setIntentCustomer(id, customerId);
            },
          };
          return work(watched);
        }),
      };
      const calls = { customer: 0, checkout: 0, order, advisory: () => advisory };
      const port = c3rem4CheckoutPort("cus_c3rem4a", now, new Date(now.getTime() + 86_400_000), calls);
      const originalCreateCustomer = port.createCustomer;
      const checkoutPort: StripeCheckoutPort = {
        ...port,
        createCustomer: async (input, idempotencyKey) => {
          const created = await originalCreateCustomer(input, idempotencyKey);
          createdCustomerId = created.customerId;
          return created;
        },
      };
      const services = createW1Services({ repository: observed, checkoutAuthority: { resolve: () => c3rem4Authority }, checkoutStripe: checkoutPort, clock: { now: () => now } });
      const subject = "c3rem4-success";
      const key = "c3rem4-success-key";
      const digest = "4".repeat(64);
      const result = await services.checkout(subject, key, digest);
      expect(order).toEqual(["readCustomer", "createCustomer", "insertCustomer", "readCustomer", "setIntentCustomer"]);
      const persisted = await client.query<{ product: string; configured_price_id: string; configured_stripe_product_id: string; stripe_customer_id: string; stripe_checkout_session_id: string; stripe_subscription_id: string }>("select product, configured_price_id, configured_stripe_product_id, stripe_customer_id, stripe_checkout_session_id, stripe_subscription_id from billing_checkout_intents where clerk_subject = $1", [subject]);
      expect(persisted.rows).toEqual([{ product: "agentkip_first_friend", configured_price_id: c3rem4Authority.priceId, configured_stripe_product_id: c3rem4Authority.productId, stripe_customer_id: "cus_c3rem4a", stripe_checkout_session_id: "cs_test_c3rem4", stripe_subscription_id: "sub_c3rem4" }]);
      expect(result).toEqual({ checkoutUrl: "https://checkout.stripe.com/c/pay/c3rem4?proof=1#state", expiresAt: new Date(now.getTime() + 86_400_000).toISOString() });
      expect(now.getTime()).toBeGreaterThan(0);
      expect(now.getMilliseconds()).toBe(0);
      expect(new Date(result.expiresAt).getTime() - now.getTime()).toBe(86_400_000);
      const beforeConflict = { ...calls };
      await expect(services.checkout(subject, key, "5".repeat(64))).rejects.toMatchObject({ code: "idempotency_conflict" });
      expect({ customer: calls.customer, checkout: calls.checkout }).toEqual({ customer: beforeConflict.customer, checkout: beforeConflict.checkout });
    } finally {
      await client.end();
    }
  }, 30_000);

  it("rejects compact invalid normalized Checkout date representatives without completion", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const now = await c3rem4Now(client);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const cases = [
        { label: "invalid", createdAt: new Date(Number.NaN), expiresAt: new Date(now.getTime() + 86_400_000) },
        { label: "epoch-zero", createdAt: new Date(0), expiresAt: new Date(86_400_000) },
        { label: "fractional-millisecond", createdAt: new Date(now.getTime() + 1), expiresAt: new Date(now.getTime() + 86_400_001) },
        { label: "twenty-three-hour", createdAt: now, expiresAt: new Date(now.getTime() + 82_800_000) },
      ];
      for (const [index, sample] of cases.entries()) {
        const subject = `c3rem4-date-${sample.label}`;
        const key = `c3rem4-date-key-${index}`;
        const services = createW1Services({
          repository: createW1Repository(c2Port(client)), checkoutAuthority: { resolve: () => c3rem4Authority },
          checkoutStripe: c3rem4CheckoutPort(`cus_c3rem4d${index}`, sample.createdAt, sample.expiresAt, { customer: 0, checkout: 0 }), clock: { now: () => now },
        });
        await expect(services.checkout(subject, key, String(index + 6).repeat(64))).rejects.toMatchObject({ code: "billing_unavailable" });
        const state = await client.query<{ status: string; response_status: number | null; stripe_checkout_session_id: string | null; stripe_subscription_id: string | null }>("select request.status, request.response_status, intent.stripe_checkout_session_id, intent.stripe_subscription_id from request_idempotency request join billing_checkout_intents intent on intent.request_idempotency_id = request.id where request.principal = $1 and request.idempotency_key = $2", [subject, key]);
        expect(state.rows).toEqual([{ status: "processing", response_status: null, stripe_checkout_session_id: null, stripe_subscription_id: null }]);
      }
    } finally {
      await client.end();
    }
  }, 30_000);

  it("validates final idempotency before final intent mutation after Checkout returns", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const now = await c3rem4Now(client);
      const { createW1Repository } = await import("@/lib/w1/repository");
      const { createW1Services } = await import("@/lib/w1/services");
      const repository = createW1Repository(c2Port(client));
      let checkoutReturned = false;
      const finalOperations: string[] = [];
      const observed: W1Repository = {
        ...repository,
        transaction: async <T>(work: (tx: W1RepositoryTx) => Promise<T>) => repository.transaction(async (tx) => {
          const watched: W1RepositoryTx = {
            ...tx,
            readIdempotency: async (route, principal, key) => {
              const record = await tx.readIdempotency(route, principal, key);
              if (!checkoutReturned) return record;
              finalOperations.push("readIdempotency");
              return record ? { ...record, principal: "c3rem4-incorrect-principal" } : null;
            },
            readIntentByIdempotency: async (id) => { if (checkoutReturned) finalOperations.push("readIntentByIdempotency"); return tx.readIntentByIdempotency(id); },
            setIntentCheckout: async (id, session, subscription) => { if (checkoutReturned) finalOperations.push("setIntentCheckout"); return tx.setIntentCheckout(id, session, subscription); },
            completeIdempotency: async (id, route, status, metadata) => { if (checkoutReturned) finalOperations.push("completeIdempotency"); return tx.completeIdempotency(id, route, status, metadata); },
          };
          return work(watched);
        }),
      };
      const base = c3rem4CheckoutPort("cus_c3rem4f", now, new Date(now.getTime() + 86_400_000), { customer: 0, checkout: 0 });
      const checkoutPort: StripeCheckoutPort = {
        ...base,
        createCheckout: async (input, idempotencyKey) => {
          const result = await base.createCheckout(input, idempotencyKey);
          checkoutReturned = true;
          return result;
        },
      };
      const subject = "c3rem4-final";
      const key = "c3rem4-final-key";
      const services = createW1Services({ repository: observed, checkoutAuthority: { resolve: () => c3rem4Authority }, checkoutStripe: checkoutPort, clock: { now: () => now } });
      await expect(services.checkout(subject, key, "b".repeat(64))).rejects.toMatchObject({ code: "billing_unavailable" });
      expect(finalOperations).toEqual(["readIdempotency"]);
      const state = await client.query<{ status: string; stripe_checkout_session_id: string | null; stripe_subscription_id: string | null }>("select request.status, intent.stripe_checkout_session_id, intent.stripe_subscription_id from request_idempotency request join billing_checkout_intents intent on intent.request_idempotency_id = request.id where request.principal = $1 and request.idempotency_key = $2", [subject, key]);
      expect(state.rows).toEqual([{ status: "processing", stripe_checkout_session_id: null, stripe_subscription_id: null }]);
    } finally {
      await client.end();
    }
  }, 30_000);

  it("rejects nullable and non-recurring retrieved Prices through the production Checkout gateway", async () => {
    const { vi } = await import("vitest");
    const calls = { sessionCreates: 0, createInputs: [] as Array<{ customer: string; line_items: Array<{ price: string; quantity: number }>; metadata: Record<string, string> }>, createKeys: [] as string[], priceRequests: [] as string[] };
    let linePriceMode: "canonical" | "null" | "undefined" | "non-recurring" = "canonical";
    vi.resetModules();
    vi.doMock("stripe", () => {
      class LocalStripe {
        static API_VERSION = "2026-07-13";
        prices = {
          retrieve: async (id: string) => {
            calls.priceRequests.push(id);
            return { object: "price", id: c3rem4Authority.priceId, active: true, recurring: { interval: "month" }, livemode: false, product: { object: "product", id: c3rem4Authority.productId, active: true, livemode: false } };
          },
        };
        customers = {
          create: async (input: { metadata: Record<string, string> }) => ({ object: "customer", id: "cus_c3rem4g", livemode: false, metadata: input.metadata }),
        };
        checkout = {
          sessions: {
            create: async (input: { customer: string; line_items: Array<{ price: string; quantity: number }>; metadata: Record<string, string> }, options: { idempotencyKey: string }) => {
              calls.sessionCreates += 1;
              calls.createInputs.push(input);
              calls.createKeys.push(options.idempotencyKey);
              return { object: "checkout.session", id: "cs_test_c3rem4g", subscription: "sub_c3rem4g", customer: input.customer, created: 1_784_217_600, expires_at: 1_784_304_000, livemode: false, mode: "subscription", metadata: input.metadata, url: "https://checkout.stripe.com/c/pay/c3rem4g?proof=1#state" };
            },
            retrieve: async () => {
              const product = { object: "product", id: c3rem4Authority.productId, active: true, livemode: false };
              const canonicalPrice = { object: "price", id: c3rem4Authority.priceId, active: true, recurring: { interval: "month" }, livemode: false, product };
              const linePrice = linePriceMode === "null" ? null : linePriceMode === "undefined" ? undefined : linePriceMode === "non-recurring" ? { ...canonicalPrice, recurring: null } : canonicalPrice;
              const metadata = calls.createInputs.at(-1)?.metadata ?? {};
              return { object: "checkout.session", id: "cs_test_c3rem4g", subscription: "sub_c3rem4g", customer: { object: "customer", id: "cus_c3rem4g", livemode: false, metadata: { agentkip_schema: "1", clerk_subject: "c3rem4-gateway" } }, created: 1_784_217_600, expires_at: 1_784_304_000, livemode: false, mode: "subscription", metadata, url: "https://checkout.stripe.com/c/pay/c3rem4g?proof=1#state", line_items: { object: "list", has_more: false, data: [{ object: "item", quantity: 1, price: linePrice }] } };
            },
          },
        };
        subscriptions = {
          retrieve: async () => {
            const product = { object: "product", id: c3rem4Authority.productId, active: true, livemode: false };
            const price = { object: "price", id: c3rem4Authority.priceId, active: true, recurring: { interval: "month" }, livemode: false, product };
            const metadata = calls.createInputs.at(-1)?.metadata ?? {};
            return { object: "subscription", id: "sub_c3rem4g", livemode: false, customer: { object: "customer", id: "cus_c3rem4g", livemode: false, metadata: { agentkip_schema: "1", clerk_subject: "c3rem4-gateway" } }, metadata, items: { object: "list", has_more: false, data: [{ object: "subscription_item", subscription: "sub_c3rem4g", quantity: 1, price }] } };
          },
        };
      }
      return { default: LocalStripe };
    });
    const { createStripeCheckoutGateway } = await import("@/lib/w1/stripe");
    const config: W1CheckoutConfig = { databaseUrl: "postgresql://isolated.invalid/test", stripeSecretKey: "local-test-key", priceId: c3rem4Authority.priceId, productId: c3rem4Authority.productId, siteOrigin: "https://agentkip.test", successUrl: "https://agentkip.test/account?checkout=success", cancelUrl: "https://agentkip.test/account?checkout=cancelled" };
    const gateway = createStripeCheckoutGateway(config);
    const canonical = { customerId: "cus_c3rem4g", subject: "c3rem4-gateway", requestId: "40000000-0000-4000-8000-000000000004", authority: c3rem4Authority };
    await gateway.validateConfiguredPrice(c3rem4Authority);
    for (const mode of ["null", "undefined", "non-recurring"] as const) {
      linePriceMode = mode;
      await expect(gateway.createCheckout(canonical, `c3rem4-${mode}`)).rejects.toThrow("checkout unavailable");
    }
    expect(calls.sessionCreates).toBe(3);
    vi.doUnmock("stripe");
  });

  it("rejects noncanonical or mismatched Checkout authority before SDK activity and forwards canonical inputs", async () => {
    const { vi } = await import("vitest");
    const calls = { sessionCreates: 0, inputs: [] as Array<{ customer: string; line_items: Array<{ price: string; quantity: number }>; metadata: Record<string, string> }>, keys: [] as string[] };
    vi.resetModules();
    vi.doMock("stripe", () => {
      class LocalStripe {
        static API_VERSION = "2026-07-13";
        prices = { retrieve: async () => ({ object: "price", id: c3rem4Authority.priceId, active: true, recurring: { interval: "month" }, livemode: false, product: { object: "product", id: c3rem4Authority.productId, active: true, livemode: false } }) };
        customers = { create: async () => ({ object: "customer", id: "cus_c3rem4h", livemode: false, metadata: { agentkip_schema: "1", clerk_subject: "c3rem4-gateway" } }) };
        checkout = { sessions: {
          create: async (input: { customer: string; line_items: Array<{ price: string; quantity: number }>; metadata: Record<string, string> }, options: { idempotencyKey: string }) => {
            calls.sessionCreates += 1; calls.inputs.push(input); calls.keys.push(options.idempotencyKey);
            return { object: "checkout.session", id: "cs_test_c3rem4h", subscription: "sub_c3rem4h", customer: input.customer, created: 1_784_217_600, expires_at: 1_784_304_000, livemode: false, mode: "subscription", metadata: input.metadata, url: "https://checkout.stripe.com/c/pay/c3rem4h?proof=1#state" };
          },
          retrieve: async () => {
            const product = { object: "product", id: c3rem4Authority.productId, active: true, livemode: false };
            const price = { object: "price", id: c3rem4Authority.priceId, active: true, recurring: { interval: "month" }, livemode: false, product };
            const metadata = calls.inputs.at(-1)?.metadata ?? {};
            return { object: "checkout.session", id: "cs_test_c3rem4h", subscription: "sub_c3rem4h", customer: { object: "customer", id: "cus_c3rem4h", livemode: false, metadata: { agentkip_schema: "1", clerk_subject: "c3rem4-gateway" } }, created: 1_784_217_600, expires_at: 1_784_304_000, livemode: false, mode: "subscription", metadata, url: "https://checkout.stripe.com/c/pay/c3rem4h?proof=1#state", line_items: { object: "list", has_more: false, data: [{ object: "item", quantity: 1, price }] } };
          },
        } };
        subscriptions = { retrieve: async () => {
          const product = { object: "product", id: c3rem4Authority.productId, active: true, livemode: false };
          const price = { object: "price", id: c3rem4Authority.priceId, active: true, recurring: { interval: "month" }, livemode: false, product };
          const metadata = calls.inputs.at(-1)?.metadata ?? {};
          return { object: "subscription", id: "sub_c3rem4h", livemode: false, customer: { object: "customer", id: "cus_c3rem4h", livemode: false, metadata: { agentkip_schema: "1", clerk_subject: "c3rem4-gateway" } }, metadata, items: { object: "list", has_more: false, data: [{ object: "subscription_item", subscription: "sub_c3rem4h", quantity: 1, price }] } };
        } };
      }
      return { default: LocalStripe };
    });
    const { createStripeCheckoutGateway } = await import("@/lib/w1/stripe");
    const config: W1CheckoutConfig = { databaseUrl: "postgresql://isolated.invalid/test", stripeSecretKey: "local-test-key", priceId: c3rem4Authority.priceId, productId: c3rem4Authority.productId, siteOrigin: "https://agentkip.test", successUrl: "https://agentkip.test/account?checkout=success", cancelUrl: "https://agentkip.test/account?checkout=cancelled" };
    const gateway = createStripeCheckoutGateway(config);
    const valid = { customerId: "cus_c3rem4h", subject: "c3rem4-gateway", requestId: "40000000-0000-4000-8000-000000000005", authority: c3rem4Authority };
    await expect(gateway.createCheckout({ ...valid, customerId: "cus_c3rem4-hyphen" }, "c3rem4-invalid-customer")).rejects.toThrow("checkout authority unavailable");
    await expect(gateway.createCheckout({ ...valid, authority: { ...c3rem4Authority, priceId: "price_other" } }, "c3rem4-invalid-price")).rejects.toThrow("checkout authority unavailable");
    await expect(gateway.createCheckout({ ...valid, authority: { ...c3rem4Authority, productId: "prod_other" } }, "c3rem4-invalid-product")).rejects.toThrow("checkout authority unavailable");
    expect(calls.sessionCreates).toBe(0);
    await gateway.validateConfiguredPrice(c3rem4Authority);
    const result = await gateway.createCheckout(valid, "c3rem4-canonical-key");
    expect(calls.inputs).toEqual([{ mode: "subscription", customer: valid.customerId, line_items: [{ price: c3rem4Authority.priceId, quantity: 1 }], allow_promotion_codes: true, payment_method_collection: "if_required", success_url: config.successUrl, cancel_url: config.cancelUrl, metadata: { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: valid.subject, checkout_request_id: valid.requestId }, subscription_data: { metadata: { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: valid.subject, checkout_request_id: valid.requestId } } }]);
    expect(calls.keys).toEqual(["c3rem4-canonical-key"]);
    expect(result).toMatchObject({ customerId: valid.customerId, priceId: c3rem4Authority.priceId, productId: c3rem4Authority.productId, metadata: { clerk_subject: valid.subject, checkout_request_id: valid.requestId } });
    vi.doUnmock("stripe");
  });
});
