import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterEach, describe, expect, it } from "vitest";

const root = process.cwd();
const migrations = ["drizzle/0000_site_baseline.sql", "drizzle/0001_w1_billing_entitlement.sql"];
const containers: Array<Awaited<ReturnType<PostgreSqlContainer["start"]>>> = [];

const expectedTableNames = [
  "billing_checkout_intents", "billing_customers", "bootstrap_claim_attempts", "bootstrap_claims", "contact_messages", "content_sections",
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
  "bootstrap_claims:bootstrap_claims_claim_hash_unique:u",
  "bootstrap_claims:bootstrap_claims_entitlement_id_entitlements_id_fk:f",
  "bootstrap_claims:bootstrap_claims_expiry_check:c",
  "bootstrap_claims:bootstrap_claims_hash_check:c",
  "bootstrap_claims:bootstrap_claims_lifecycle_check:c",
  "bootstrap_claims:bootstrap_claims_pepper_check:c",
  "bootstrap_claims:bootstrap_claims_pkey:p",
  "bootstrap_claims:bootstrap_claims_redemption_id_unique:u",
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
  "bootstrap_claim_attempts_ip_created_idx", "bootstrap_claims_active_subject_entitlement_unique", "entitlements_active_subject_product_unique",
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

describe("W1 additive migrations", () => {
  it("applies the baseline and W1 schema to an empty disposable database", async () => {
    const client = await createClient();
    try {
      await applyMigrations(client);
      const tables = await client.query<{ table_name: string }>("select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name");
      const enums = await client.query<{ enum_name: string; enum_value: string }>("select type.typname as enum_name, enum.enumlabel as enum_value from pg_type type join pg_enum enum on enum.enumtypid = type.oid join pg_namespace namespace on namespace.oid = type.typnamespace where namespace.nspname = 'public' order by type.typname, enum.enumsortorder");
      const constraints = await client.query<{ table_name: string; conname: string; contype: string }>("select cls.relname as table_name, con.conname, con.contype from pg_constraint con join pg_class cls on cls.oid = con.conrelid join pg_namespace namespace on namespace.oid = cls.relnamespace where namespace.nspname = 'public' and cls.relname = any($1::text[]) order by cls.relname, con.conname", [expectedTableNames]);
      const indexes = await client.query<{ index_name: string }>("select index_class.relname as index_name from pg_index index_definition join pg_class table_class on table_class.oid = index_definition.indrelid join pg_namespace namespace on namespace.oid = table_class.relnamespace join pg_class index_class on index_class.oid = index_definition.indexrelid left join pg_constraint con on con.conindid = index_definition.indexrelid where namespace.nspname = 'public' and table_class.relname = any($1::text[]) and con.oid is null order by index_class.relname", [expectedTableNames]);
      expect(tables.rows.map((row) => row.table_name)).toEqual(expectedTableNames);
      expect(enums.rows.map((row) => `${row.enum_name}|${row.enum_value}`)).toEqual(expectedEnumValues);
      expect(constraints.rows.map((row) => `${row.table_name}:${row.conname}:${row.contype}`)).toEqual(expectedConstraints);
      expect(indexes.rows.map((row) => row.index_name)).toEqual(expectedApplicationIndexes);
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
