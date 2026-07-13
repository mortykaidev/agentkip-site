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
];
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

describe("W1 forward constraint repair", () => {
  it("uses the canonical migrator on an empty database and records all three migrations", async () => {
    const client = await createClient();
    try {
      await applyCanonicalMigrations(client);
      expect((await readLedger(client)).rows.map((row) => Number(row.created_at))).toEqual([1783951023454, 1783951023728, 1783958463468]);
    } finally {
      await client.end();
    }
  }, 30_000);

  it("applies only 0002 through the canonical migrator after recorded 0001 and preserves seeded rows", async () => {
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
      expect((await readLedger(client)).rows.map((row) => Number(row.created_at))).toEqual([1783951023454, 1783951023728, 1783958463468]);
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
