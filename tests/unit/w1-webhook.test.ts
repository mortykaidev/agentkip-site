import { beforeEach, describe, expect, it, vi } from "vitest";

const stripeMock = vi.hoisted(() => {
  let subscriptionResult: unknown;
  let sessionListResult: unknown;
  let customerResult: unknown;
  let invoiceResult: unknown;
  let sessionResult: unknown;
  const trace: string[] = [];
  const subscriptionsRetrieve = vi.fn(async (...args: unknown[]) => { trace.push(`subscriptions.retrieve:${JSON.stringify(args)}`); return subscriptionResult; });
  const checkoutSessionsList = vi.fn(async (...args: unknown[]) => { trace.push(`checkout.sessions.list:${JSON.stringify(args)}`); return sessionListResult; });
  const customersRetrieve = vi.fn(async (...args: unknown[]) => { trace.push(`customers.retrieve:${JSON.stringify(args)}`); return customerResult; });
  const checkoutSessionsRetrieve = vi.fn(async (...args: unknown[]) => { trace.push(`checkout.sessions.retrieve:${JSON.stringify(args)}`); return sessionResult; });
  const invoicesRetrieve = vi.fn(async (...args: unknown[]) => { trace.push(`invoices.retrieve:${JSON.stringify(args)}`); return invoiceResult; });
  const constructEvent = vi.fn();
  class Stripe {
    static API_VERSION = "2026-06-01";
    constructor() {
      return { subscriptions: { retrieve: subscriptionsRetrieve }, checkout: { sessions: { list: checkoutSessionsList, retrieve: checkoutSessionsRetrieve } }, customers: { retrieve: customersRetrieve }, invoices: { retrieve: invoicesRetrieve }, webhooks: { constructEvent } };
    }
  }
  return {
    Stripe,
    trace,
    configure(results: { subscription: unknown; sessionList: unknown; customer: unknown; invoice?: unknown; session?: unknown }) { subscriptionResult = results.subscription; sessionListResult = results.sessionList; customerResult = results.customer; invoiceResult = results.invoice; sessionResult = results.session; },
    reset() { subscriptionResult = undefined; sessionListResult = undefined; customerResult = undefined; invoiceResult = undefined; sessionResult = undefined; trace.length = 0; subscriptionsRetrieve.mockClear(); checkoutSessionsList.mockClear(); customersRetrieve.mockClear(); checkoutSessionsRetrieve.mockClear(); invoicesRetrieve.mockClear(); constructEvent.mockClear(); },
    subscriptionsRetrieve,
    checkoutSessionsList,
    customersRetrieve,
    checkoutSessionsRetrieve,
    invoicesRetrieve,
    constructEvent,
  };
});

vi.mock("stripe", () => ({ default: stripeMock.Stripe }));

import { classifySupportedEvent, compareEventTuple, mapSubscriptionStatus } from "@/lib/w1/webhook";
import { createStripeWebhookGateway } from "@/lib/w1/stripe";
import { createW1Services } from "@/lib/w1/services";
import type { StripeEventRow, W1Repository, W1RepositoryTx, W1WebhookRepositoryTx, WebhookEventRow } from "@/lib/w1/repository";

type MockWebhookTx = Pick<W1RepositoryTx, "insertEvent" | "acquireAdvisoryLock"> & W1WebhookRepositoryTx;
describe("W1 webhook policy", () => { it("orders authority tuples", () => { expect(compareEventTuple({ createdAt: new Date(1), precedence: 1, id: "a" }, { createdAt: new Date(1), precedence: 1, id: "b" })).toBeLessThan(0); expect(mapSubscriptionStatus("active")).toBe("active"); }); });

describe("W1 C5 bounded webhook fulfillment", () => {
  it("production-drives the Stripe gateway and durable ignored outcome without provider reads", async () => {
    const gateway = createStripeWebhookGateway({ databaseUrl: "postgresql://local.invalid/test", stripeSecretKey: "sk_test_local", stripeWebhookSecret: "whsec_local", priceId: "price_c5unit", productId: "prod_c5unit" });
    await expect(gateway.loadAuthorityBundle({ id: "evt_c5unsupported", type: "charge.succeeded", createdAt: new Date("2026-07-14T00:00:00.000Z"), livemode: false, object: {} })).resolves.toMatchObject({ valid: false, failureCode: "malformed_supported_object" });
    const events = new Map<string, WebhookEventRow>();
    const tx: MockWebhookTx = {
      insertEvent: async (event: StripeEventRow) => { if (events.has(event.stripeEventId)) return null; const row: WebhookEventRow = { ...event, processedAt: null, nextRetryAt: null }; events.set(event.stripeEventId, row); return row; },
      readWebhookEvent: async (id: string) => events.get(id) ?? null,
      lockStripeEvent: async (id: string) => events.get(id) ?? null,
      updateWebhookEvent: async (event: WebhookEventRow) => { events.set(event.stripeEventId, event); return event; },
      lockIntentByStripeReferences: async () => null,
      applyWebhookEntitlement: async () => { throw new Error("not reached"); },
      acquireAdvisoryLock: async () => {},
    };
    const records: Array<Record<string, unknown>> = [];
    const repository: W1Repository = { transaction: (work) => work(tx as unknown as W1RepositoryTx) as ReturnType<typeof work>, cleanupExpiredProcessingIdempotency: async () => {}, readEntitlement: async () => null, close: async () => {} };
    const services = createW1Services({ repository, webhookStripe: gateway, logger: { webhook: (record) => records.push(record) } });
    await expect(services.handleWebhook({ id: "evt_c5unsupported", type: "charge.succeeded", createdAt: new Date("2026-07-14T00:00:00.000Z"), livemode: false, object: {} }, "50000000-0000-4000-8000-000000000001")).resolves.toEqual({ received: true });
    expect(events.get("evt_c5unsupported")).toMatchObject({ status: "ignored", attemptCount: 1 });
    expect(Object.keys(records[0] ?? {}).sort()).toEqual(["attemptCount", "duplicate", "eventId", "eventType", "requestId", "status"]);
  });

  it("maps every supported event and subscription status without accepting unknown status", () => {
    for (const event of ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "invoice.paid", "invoice.payment_failed"]) expect(classifySupportedEvent(event)).toBe(event);
    expect(classifySupportedEvent("charge.succeeded")).toBeNull();
    expect(mapSubscriptionStatus("trialing")).toBe("active");
    expect(mapSubscriptionStatus("incomplete")).toBe("pending");
    expect(mapSubscriptionStatus("past_due")).toBe("past_due");
    expect(mapSubscriptionStatus("unpaid")).toBe("past_due");
    for (const status of ["incomplete_expired", "canceled", "paused"]) expect(mapSubscriptionStatus(status)).toBe("revoked");
    expect(mapSubscriptionStatus("unknown")).toBeNull();
  });
});

describe("W1 C5R6A customer.subscription.updated gateway evidence", () => {
  const config = { databaseUrl: "postgresql://local.invalid/test", stripeSecretKey: "sk_test_local", stripeWebhookSecret: "whsec_local", priceId: "price_c5unit", productId: "prod_c5unit" };
  const requestId = "50000000-0000-4000-8000-00000000006a";
  const checkoutMetadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: requestId };
  const customerMetadata = { agentkip_schema: "1", clerk_subject: "user_c5r6a" };
  type ExpandedCustomerFixture = { id: string; object?: string; livemode?: boolean; metadata?: Record<string, unknown>; deleted?: unknown };
  const expandedCustomer = (id = "cus_c5r6a"): ExpandedCustomerFixture => ({ object: "customer", id, livemode: false, metadata: { ...customerMetadata } });
  const rereadCustomer = () => ({ ...expandedCustomer(), deleted: undefined });
  const baseline = () => {
    return {
      subscription: { object: "subscription", id: "sub_c5r6a", livemode: false, customer: expandedCustomer(), metadata: { ...checkoutMetadata }, status: "active", items: { object: "list", has_more: false, data: [{ object: "subscription_item", subscription: "sub_c5r6a", quantity: 1, price: { object: "price", id: "price_c5unit", livemode: false, recurring: { interval: "month" }, product: { object: "product", id: "prod_c5unit", livemode: false, active: true, deleted: undefined } } }] } },
      session: { object: "checkout.session", id: "cs_test_c5r6a", livemode: false, mode: "subscription", customer: expandedCustomer(), subscription: "sub_c5r6a", metadata: { ...checkoutMetadata } },
      customer: rereadCustomer(),
    };
  };
  const envelope = () => ({ id: "evt_c5r6a", type: "customer.subscription.updated", createdAt: new Date("2026-07-14T00:00:00.000Z"), livemode: false, object: { object: "subscription", id: "sub_c5r6a" } });
  const configure = (fixtures: ReturnType<typeof baseline>) => stripeMock.configure({ subscription: fixtures.subscription, sessionList: { object: "list", has_more: false, data: [fixtures.session] }, customer: fixtures.customer });

  beforeEach(() => stripeMock.reset());

  it("classifies the ten expanded Customer relationship mutations before Customer reread", async () => {
    const cases: Array<{ name: string; expected: "malformed_supported_object" | "identifier_mismatch"; mutate: (fixtures: ReturnType<typeof baseline>) => void }> = [
      { name: "generic session Customer object", expected: "malformed_supported_object", mutate: ({ session }) => { session.customer = { id: "cus_c5r6a" }; } },
      { name: "wrong subscription Customer object kind", expected: "malformed_supported_object", mutate: ({ subscription }) => { subscription.customer.object = "account"; } },
      { name: "live session Customer", expected: "malformed_supported_object", mutate: ({ session }) => { session.customer.livemode = true; } },
      { name: "true subscription Customer deletion sentinel", expected: "malformed_supported_object", mutate: ({ subscription }) => { subscription.customer.deleted = true; } },
      { name: "null session Customer deletion sentinel", expected: "malformed_supported_object", mutate: ({ session }) => { session.customer.deleted = null; } },
      { name: "false subscription Customer deletion sentinel", expected: "malformed_supported_object", mutate: ({ subscription }) => { subscription.customer.deleted = false; } },
      { name: "missing session Customer metadata", expected: "malformed_supported_object", mutate: ({ session }) => { delete session.customer.metadata; } },
      { name: "non-string subscription Customer metadata", expected: "malformed_supported_object", mutate: ({ subscription }) => { subscription.customer.metadata = { clerk_subject: 7 }; } },
      { name: "noncanonical session Customer ID", expected: "malformed_supported_object", mutate: ({ session }) => { session.customer.id = "cus_bad-hyphen"; } },
      { name: "unequal structurally valid Customer IDs", expected: "identifier_mismatch", mutate: ({ subscription }) => { subscription.customer.id = "cus_c5r6b"; } },
    ];

    for (const row of cases) {
      const fixtures = baseline();
      row.mutate(fixtures);
      configure(fixtures);
      const resultPromise = createStripeWebhookGateway(config).loadAuthorityBundle(envelope());
      await expect(resultPromise).resolves.toMatchObject({ valid: false, failureCode: row.expected });
      const result = await resultPromise;
      expect(result.valid).toBe(false);
      expect(result.failureCode).toBe(row.expected);
      expect(stripeMock.customersRetrieve).toHaveBeenCalledTimes(0);
      stripeMock.reset();
    }
  });

  it("uses the exact subscription-update SDK trace for valid equal expanded Customers", async () => {
    const fixtures = baseline();
    configure(fixtures);

    const result = await createStripeWebhookGateway(config).loadAuthorityBundle(envelope());

    expect(stripeMock.trace).toEqual(["subscriptions.retrieve:[\"sub_c5r6a\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]", "checkout.sessions.list:[{\"subscription\":\"sub_c5r6a\",\"limit\":2}]", "customers.retrieve:[\"cus_c5r6a\"]"]);
    expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
    expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith("sub_c5r6a", { expand: ["customer", "items.data.price.product"] });
    expect(stripeMock.checkoutSessionsList).toHaveBeenCalledTimes(1);
    expect(stripeMock.checkoutSessionsList).toHaveBeenCalledWith({ subscription: "sub_c5r6a", limit: 2 });
    expect(stripeMock.customersRetrieve).toHaveBeenCalledTimes(1);
    expect(stripeMock.customersRetrieve).toHaveBeenCalledWith("cus_c5r6a");
    expect(stripeMock.invoicesRetrieve).not.toHaveBeenCalled();
    expect(stripeMock.checkoutSessionsRetrieve).not.toHaveBeenCalled();
    expect(stripeMock.constructEvent).not.toHaveBeenCalled();
    expect(result.valid).toBe(true);
    expect(Object.hasOwn(result, "failureCode")).toBe(false);
    expect(result.reference).toEqual({ sessionId: "cs_test_c5r6a", subscriptionId: "sub_c5r6a", customerId: "cus_c5r6a" });
    expect(result.status).toBe("active");
    expect(result.clerkSubject).toBe("user_c5r6a");
    expect(result.checkoutRequestId).toBe("50000000-0000-4000-8000-00000000006a");
    expect(result.priceId).toBe("price_c5unit");
    expect(result.productId).toBe("prod_c5unit");
    expect(result).toEqual({ valid: true, reference: { sessionId: "cs_test_c5r6a", subscriptionId: "sub_c5r6a", customerId: "cus_c5r6a" }, status: "active", clerkSubject: "user_c5r6a", checkoutRequestId: requestId, priceId: "price_c5unit", productId: "prod_c5unit" });
  });

  it("C5R6C Customer reread absence and deletion evidence", async () => {
    const cases = [
      { name: "absent Customer reread", customer: undefined },
      { name: "deleted Customer reread", customer: { object: "customer", id: "cus_c5r6a", deleted: true } },
    ];

    for (const row of cases) {
      stripeMock.reset();
      const fixtures = baseline();
      stripeMock.configure({ subscription: fixtures.subscription, sessionList: { object: "list", has_more: false, data: [fixtures.session] }, customer: row.customer });
      const resultPromise = createStripeWebhookGateway(config).loadAuthorityBundle(envelope());
      await expect(resultPromise).resolves.toEqual({ valid: false, failureCode: "unknown_customer", reference: { sessionId: "cs_test_c5r6a", subscriptionId: "sub_c5r6a", customerId: "cus_c5r6a" } });
      const result = await resultPromise;

      expect(result.valid).toBe(false);
      expect(result.failureCode).toBe("unknown_customer");
      expect(result.reference.sessionId).toBe("cs_test_c5r6a");
      expect(result.reference.subscriptionId).toBe("sub_c5r6a");
      expect(result.reference.customerId).toBe("cus_c5r6a");
      expect(stripeMock.trace).toEqual(["subscriptions.retrieve:[\"sub_c5r6a\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]", "checkout.sessions.list:[{\"subscription\":\"sub_c5r6a\",\"limit\":2}]", "customers.retrieve:[\"cus_c5r6a\"]"]);
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledTimes(1);
      expect(stripeMock.customersRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.invoicesRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.constructEvent).toHaveBeenCalledTimes(0);
    }
  });

  it("C5R6D Customer reread identifier mismatch evidence", async () => {
    const fixtures = baseline();
    stripeMock.reset();
    stripeMock.configure({
      subscription: fixtures.subscription,
      sessionList: { object: "list", has_more: false, data: [fixtures.session] },
      customer: {
        object: "customer",
        id: "cus_c5r6d",
        livemode: false,
        metadata: {
          agentkip_schema: "1",
          clerk_subject: "user_c5r6a",
        },
        deleted: undefined,
      },
    });
    const resultPromise = createStripeWebhookGateway(config).loadAuthorityBundle(envelope());

    await expect(resultPromise).resolves.toEqual({
      valid: false,
      failureCode: "identifier_mismatch",
      reference: {
        sessionId: "cs_test_c5r6a",
        subscriptionId: "sub_c5r6a",
        customerId: "cus_c5r6a",
      },
    });
    const result = await resultPromise;

    expect(result.valid).toBe(false);
    expect(result.failureCode).toBe("identifier_mismatch");
    expect(result.reference.sessionId).toBe("cs_test_c5r6a");
    expect(result.reference.subscriptionId).toBe("sub_c5r6a");
    expect(result.reference.customerId).toBe("cus_c5r6a");
    expect(stripeMock.trace).toEqual([
      "subscriptions.retrieve:[\"sub_c5r6a\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]",
      "checkout.sessions.list:[{\"subscription\":\"sub_c5r6a\",\"limit\":2}]",
      "customers.retrieve:[\"cus_c5r6a\"]",
    ]);
    expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
    expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith("sub_c5r6a", { expand: ["customer", "items.data.price.product"] });
    expect(stripeMock.checkoutSessionsList).toHaveBeenCalledTimes(1);
    expect(stripeMock.checkoutSessionsList).toHaveBeenCalledWith({ subscription: "sub_c5r6a", limit: 2 });
    expect(stripeMock.customersRetrieve).toHaveBeenCalledTimes(1);
    expect(stripeMock.customersRetrieve).toHaveBeenCalledWith("cus_c5r6a");
    expect(stripeMock.invoicesRetrieve).toHaveBeenCalledTimes(0);
    expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledTimes(0);
    expect(stripeMock.constructEvent).toHaveBeenCalledTimes(0);
  });

  it("C5R6E Customer reread structural classification evidence", async () => {
    const cases: Array<{
      name: string;
      mutate: (customer: Record<string, unknown>) => void;
    }> = [
      { name: "delete object", mutate: (customer) => { delete customer.object; } },
      { name: "object account", mutate: (customer) => { customer.object = "account"; } },
      { name: "delete livemode", mutate: (customer) => { delete customer.livemode; } },
      { name: "livemode true", mutate: (customer) => { customer.livemode = true; } },
      { name: "deleted null", mutate: (customer) => { customer.deleted = null; } },
      { name: "deleted false", mutate: (customer) => { customer.deleted = false; } },
    ];

    for (const row of cases) {
      const fixtures = baseline();
      const customer: Record<string, unknown> = { ...fixtures.customer };
      row.mutate(customer);
      stripeMock.reset();
      stripeMock.configure({
        subscription: fixtures.subscription,
        sessionList: { object: "list", has_more: false, data: [fixtures.session] },
        customer,
      });
      const resultPromise = createStripeWebhookGateway(config).loadAuthorityBundle(envelope());

      await expect(resultPromise).resolves.toEqual({
        valid: false,
        failureCode: "malformed_supported_object",
        reference: {
          sessionId: "cs_test_c5r6a",
          subscriptionId: "sub_c5r6a",
          customerId: "cus_c5r6a",
        },
      });
      const result = await resultPromise;

      expect(result.valid).toBe(false);
      expect(result.failureCode).toBe("malformed_supported_object");
      expect(result.reference.sessionId).toBe("cs_test_c5r6a");
      expect(result.reference.subscriptionId).toBe("sub_c5r6a");
      expect(result.reference.customerId).toBe("cus_c5r6a");
      expect(stripeMock.trace).toEqual([
        "subscriptions.retrieve:[\"sub_c5r6a\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]",
        "checkout.sessions.list:[{\"subscription\":\"sub_c5r6a\",\"limit\":2}]",
        "customers.retrieve:[\"cus_c5r6a\"]",
      ]);
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith(
        "sub_c5r6a",
        { expand: ["customer", "items.data.price.product"] },
      );
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledWith({
        subscription: "sub_c5r6a",
        limit: 2,
      });
      expect(stripeMock.customersRetrieve).toHaveBeenCalledWith("cus_c5r6a");
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledTimes(1);
      expect(stripeMock.customersRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.invoicesRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.constructEvent).toHaveBeenCalledTimes(0);
    }
  });

  it("C5R6F Customer reread metadata classification evidence", async () => {
    const cases: Array<{
      name: string;
      mutate: (customer: Record<string, unknown>) => void;
    }> = [
      { name: "delete metadata", mutate: (customer) => { delete customer.metadata; } },
      { name: "metadata null", mutate: (customer) => { customer.metadata = null; } },
      { name: "metadata array", mutate: (customer) => { customer.metadata = []; } },
      { name: "metadata string", mutate: (customer) => { customer.metadata = "invalid"; } },
      { name: "metadata empty", mutate: (customer) => { customer.metadata = {}; } },
      { name: "schema absent", mutate: (customer) => { customer.metadata = { clerk_subject: "user_c5r6a" }; } },
      { name: "schema wrong string", mutate: (customer) => { customer.metadata = { agentkip_schema: "2", clerk_subject: "user_c5r6a" }; } },
      { name: "schema non-string", mutate: (customer) => { customer.metadata = { agentkip_schema: 1, clerk_subject: "user_c5r6a" }; } },
      { name: "clerk subject absent", mutate: (customer) => { customer.metadata = { agentkip_schema: "1" }; } },
      { name: "clerk subject empty", mutate: (customer) => { customer.metadata = { agentkip_schema: "1", clerk_subject: "" }; } },
      { name: "clerk subject non-string", mutate: (customer) => { customer.metadata = { agentkip_schema: "1", clerk_subject: 7 }; } },
      { name: "clerk subject disagreement", mutate: (customer) => { customer.metadata = { agentkip_schema: "1", clerk_subject: "user_c5r6f" }; } },
      { name: "extra metadata key", mutate: (customer) => { customer.metadata = { agentkip_schema: "1", clerk_subject: "user_c5r6a", unexpected: "value" }; } },
    ];

    for (const row of cases) {
      const fixtures = baseline();
      const customer: Record<string, unknown> = {
        ...fixtures.customer,
        metadata: { ...customerMetadata },
      };
      row.mutate(customer);
      stripeMock.reset();
      stripeMock.configure({
        subscription: fixtures.subscription,
        sessionList: { object: "list", has_more: false, data: [fixtures.session] },
        customer,
      });
      const resultPromise = createStripeWebhookGateway(config).loadAuthorityBundle(envelope());

      await expect(resultPromise).resolves.toEqual({
        valid: false,
        failureCode: "metadata_mismatch",
        reference: {
          sessionId: "cs_test_c5r6a",
          subscriptionId: "sub_c5r6a",
          customerId: "cus_c5r6a",
        },
      });
      const result = await resultPromise;

      expect(result.valid).toBe(false);
      expect(result.failureCode).toBe("metadata_mismatch");
      expect(result.reference.sessionId).toBe("cs_test_c5r6a");
      expect(result.reference.subscriptionId).toBe("sub_c5r6a");
      expect(result.reference.customerId).toBe("cus_c5r6a");
      expect(stripeMock.trace).toEqual([
        "subscriptions.retrieve:[\"sub_c5r6a\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]",
        "checkout.sessions.list:[{\"subscription\":\"sub_c5r6a\",\"limit\":2}]",
        "customers.retrieve:[\"cus_c5r6a\"]",
      ]);
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith(
        "sub_c5r6a",
        { expand: ["customer", "items.data.price.product"] },
      );
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledWith({
        subscription: "sub_c5r6a",
        limit: 2,
      });
      expect(stripeMock.customersRetrieve).toHaveBeenCalledWith("cus_c5r6a");
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledTimes(1);
      expect(stripeMock.customersRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.invoicesRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.constructEvent).toHaveBeenCalledTimes(0);
    }
  });

  it("C5R6G Session metadata classification evidence", async () => {
    const cases: Array<{
      name: string;
      mutate: (session: Record<string, unknown>) => void;
    }> = [
      { name: "delete metadata", mutate: (session) => { delete session.metadata; } },
      { name: "metadata null", mutate: (session) => { session.metadata = null; } },
      { name: "metadata array", mutate: (session) => { session.metadata = []; } },
      { name: "metadata string", mutate: (session) => { session.metadata = "invalid"; } },
      { name: "metadata empty", mutate: (session) => { session.metadata = {}; } },
      { name: "schema absent", mutate: (session) => { session.metadata = { agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "schema wrong string", mutate: (session) => { session.metadata = { agentkip_schema: "2", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "schema non-string", mutate: (session) => { session.metadata = { agentkip_schema: 1, agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "product absent", mutate: (session) => { session.metadata = { agentkip_schema: "1", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "product wrong string", mutate: (session) => { session.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_other", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "product non-string", mutate: (session) => { session.metadata = { agentkip_schema: "1", agentkip_product: 7, clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "clerk subject absent", mutate: (session) => { session.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "clerk subject wrong string", mutate: (session) => { session.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6g", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "clerk subject non-string", mutate: (session) => { session.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: 7, checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "checkout request absent", mutate: (session) => { session.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a" }; } },
      { name: "checkout request empty", mutate: (session) => { session.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: "" }; } },
      { name: "checkout request non-string", mutate: (session) => { session.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: 7 }; } },
      { name: "checkout request disagreement", mutate: (session) => { session.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-000000000067" }; } },
      { name: "extra metadata key", mutate: (session) => { session.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a", unexpected: "value" }; } },
    ];

    for (const row of cases) {
      const fixtures = baseline();
      const session: Record<string, unknown> = {
        ...fixtures.session,
        metadata: { ...checkoutMetadata },
      };
      row.mutate(session);
      stripeMock.reset();
      stripeMock.configure({
        subscription: fixtures.subscription,
        sessionList: {
          object: "list",
          has_more: false,
          data: [session],
        },
        customer: fixtures.customer,
      });
      const resultPromise = createStripeWebhookGateway(config).loadAuthorityBundle(envelope());

      await expect(resultPromise).resolves.toEqual({
        valid: false,
        failureCode: "metadata_mismatch",
        reference: {
          sessionId: "cs_test_c5r6a",
          subscriptionId: "sub_c5r6a",
          customerId: "cus_c5r6a",
        },
      });
      const result = await resultPromise;

      expect(result.valid).toBe(false);
      expect(result.failureCode).toBe("metadata_mismatch");
      expect(result.reference.sessionId).toBe("cs_test_c5r6a");
      expect(result.reference.subscriptionId).toBe("sub_c5r6a");
      expect(result.reference.customerId).toBe("cus_c5r6a");
      expect(stripeMock.trace).toEqual([
        "subscriptions.retrieve:[\"sub_c5r6a\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]",
        "checkout.sessions.list:[{\"subscription\":\"sub_c5r6a\",\"limit\":2}]",
        "customers.retrieve:[\"cus_c5r6a\"]",
      ]);
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith(
        "sub_c5r6a",
        { expand: ["customer", "items.data.price.product"] },
      );
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledWith({
        subscription: "sub_c5r6a",
        limit: 2,
      });
      expect(stripeMock.customersRetrieve).toHaveBeenCalledWith("cus_c5r6a");
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledTimes(1);
      expect(stripeMock.customersRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.invoicesRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.constructEvent).toHaveBeenCalledTimes(0);
    }
  });

  it("C5R6H Subscription metadata classification evidence", async () => {
    const cases: Array<{
      name: string;
      mutate: (subscription: Record<string, unknown>) => void;
    }> = [
      { name: "delete metadata", mutate: (subscription) => { delete subscription.metadata; } },
      { name: "metadata null", mutate: (subscription) => { subscription.metadata = null; } },
      { name: "metadata array", mutate: (subscription) => { subscription.metadata = []; } },
      { name: "metadata string", mutate: (subscription) => { subscription.metadata = "invalid"; } },
      { name: "metadata empty", mutate: (subscription) => { subscription.metadata = {}; } },
      { name: "schema absent", mutate: (subscription) => { subscription.metadata = { agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "schema wrong string", mutate: (subscription) => { subscription.metadata = { agentkip_schema: "2", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "schema non-string", mutate: (subscription) => { subscription.metadata = { agentkip_schema: 1, agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "product absent", mutate: (subscription) => { subscription.metadata = { agentkip_schema: "1", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "product wrong string", mutate: (subscription) => { subscription.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_other", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "product non-string", mutate: (subscription) => { subscription.metadata = { agentkip_schema: "1", agentkip_product: 7, clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "clerk subject absent", mutate: (subscription) => { subscription.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "clerk subject disagreement", mutate: (subscription) => { subscription.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6h", checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "clerk subject non-string", mutate: (subscription) => { subscription.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: 7, checkout_request_id: "50000000-0000-4000-8000-00000000006a" }; } },
      { name: "checkout request absent", mutate: (subscription) => { subscription.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a" }; } },
      { name: "checkout request disagreement", mutate: (subscription) => { subscription.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-000000000068" }; } },
      { name: "checkout request non-string", mutate: (subscription) => { subscription.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: 7 }; } },
      { name: "extra metadata key", mutate: (subscription) => { subscription.metadata = { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: "user_c5r6a", checkout_request_id: "50000000-0000-4000-8000-00000000006a", unexpected: "value" }; } },
    ];

    for (const row of cases) {
      const fixtures = baseline();
      const subscription: Record<string, unknown> = {
        ...fixtures.subscription,
        metadata: { ...checkoutMetadata },
      };
      row.mutate(subscription);
      stripeMock.reset();
      stripeMock.configure({
        subscription,
        sessionList: {
          object: "list",
          has_more: false,
          data: [fixtures.session],
        },
        customer: fixtures.customer,
      });
      const resultPromise = createStripeWebhookGateway(config).loadAuthorityBundle(envelope());

      await expect(resultPromise).resolves.toEqual({
        valid: false,
        failureCode: "metadata_mismatch",
        reference: {
          sessionId: "cs_test_c5r6a",
          subscriptionId: "sub_c5r6a",
          customerId: "cus_c5r6a",
        },
      });
      const result = await resultPromise;

      expect(result.valid).toBe(false);
      expect(result.failureCode).toBe("metadata_mismatch");
      expect(result.reference.sessionId).toBe("cs_test_c5r6a");
      expect(result.reference.subscriptionId).toBe("sub_c5r6a");
      expect(result.reference.customerId).toBe("cus_c5r6a");
      expect(stripeMock.trace).toEqual([
        "subscriptions.retrieve:[\"sub_c5r6a\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]",
        "checkout.sessions.list:[{\"subscription\":\"sub_c5r6a\",\"limit\":2}]",
        "customers.retrieve:[\"cus_c5r6a\"]",
      ]);
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith(
        "sub_c5r6a",
        { expand: ["customer", "items.data.price.product"] },
      );
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledWith({
        subscription: "sub_c5r6a",
        limit: 2,
      });
      expect(stripeMock.customersRetrieve).toHaveBeenCalledWith("cus_c5r6a");
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledTimes(1);
      expect(stripeMock.customersRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.invoicesRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.constructEvent).toHaveBeenCalledTimes(0);
    }
  });

  it("C5R6I Subscription item, Price, and Product authority classification evidence", async () => {
    const makeItemAuthorityFixture = () => {
      const fixtures = baseline();
      const product: Record<string, unknown> = {
        object: "product",
        id: "prod_c5unit",
        livemode: false,
        active: true,
        deleted: undefined,
      };
      const price: Record<string, unknown> = {
        object: "price",
        id: "price_c5unit",
        livemode: false,
        recurring: {
          interval: "month",
        },
        product,
      };
      const item: Record<string, unknown> = {
        object: "subscription_item",
        subscription: "sub_c5r6a",
        quantity: 1,
        price,
      };
      const data: unknown[] = [item];
      const items: Record<string, unknown> = {
        object: "list",
        has_more: false,
        data,
      };
      const subscription: Record<string, unknown> = {
        ...fixtures.subscription,
        items,
      };

      return {
        fixtures,
        subscription,
        items,
        data,
        item,
        price,
        product,
      };
    };

    const cases: Array<{
      name: string;
      expected:
        | "malformed_supported_object"
        | "price_mismatch"
        | "product_mismatch";
      mutate: (
        authority: ReturnType<typeof makeItemAuthorityFixture>,
      ) => void;
    }> = [
      { name: "delete items", expected: "malformed_supported_object", mutate: (authority) => { delete authority.subscription.items; } },
      { name: "items null", expected: "malformed_supported_object", mutate: (authority) => { authority.subscription.items = null; } },
      { name: "items array", expected: "malformed_supported_object", mutate: (authority) => { authority.subscription.items = []; } },
      { name: "items scalar", expected: "malformed_supported_object", mutate: (authority) => { authority.subscription.items = "invalid"; } },
      { name: "list object absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.items.object; } },
      { name: "list object wrong", expected: "malformed_supported_object", mutate: (authority) => { authority.items.object = "collection"; } },
      { name: "has_more absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.items.has_more; } },
      { name: "has_more true", expected: "malformed_supported_object", mutate: (authority) => { authority.items.has_more = true; } },
      { name: "list data absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.items.data; } },
      { name: "list data null", expected: "malformed_supported_object", mutate: (authority) => { authority.items.data = null; } },
      { name: "list data object", expected: "malformed_supported_object", mutate: (authority) => { authority.items.data = {}; } },
      { name: "list data scalar", expected: "malformed_supported_object", mutate: (authority) => { authority.items.data = "invalid"; } },
      { name: "list data empty", expected: "malformed_supported_object", mutate: (authority) => { authority.items.data = []; } },
      { name: "list data two items", expected: "malformed_supported_object", mutate: (authority) => { authority.items.data = [authority.item, { ...authority.item }]; } },
      { name: "sole item null", expected: "malformed_supported_object", mutate: (authority) => { authority.data[0] = null; } },
      { name: "sole item array", expected: "malformed_supported_object", mutate: (authority) => { authority.data[0] = []; } },
      { name: "sole item scalar", expected: "malformed_supported_object", mutate: (authority) => { authority.data[0] = "invalid"; } },
      { name: "item object absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.item.object; } },
      { name: "item object wrong", expected: "malformed_supported_object", mutate: (authority) => { authority.item.object = "line_item"; } },
      { name: "quantity absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.item.quantity; } },
      { name: "quantity wrong number", expected: "malformed_supported_object", mutate: (authority) => { authority.item.quantity = 2; } },
      { name: "quantity non-number", expected: "malformed_supported_object", mutate: (authority) => { authority.item.quantity = "1"; } },
      { name: "Subscription link absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.item.subscription; } },
      { name: "Subscription link noncanonical", expected: "malformed_supported_object", mutate: (authority) => { authority.item.subscription = "sub_bad-hyphen"; } },
      { name: "Subscription link disagreement", expected: "malformed_supported_object", mutate: (authority) => { authority.item.subscription = "sub_c5r6i"; } },
      { name: "Subscription link object missing ID", expected: "malformed_supported_object", mutate: (authority) => { authority.item.subscription = { object: "subscription" }; } },
      { name: "expanded Subscription link disagreement", expected: "malformed_supported_object", mutate: (authority) => { authority.item.subscription = { object: "subscription", id: "sub_c5r6i", livemode: false }; } },
      { name: "Price absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.item.price; } },
      { name: "Price null", expected: "malformed_supported_object", mutate: (authority) => { authority.item.price = null; } },
      { name: "Price array", expected: "malformed_supported_object", mutate: (authority) => { authority.item.price = []; } },
      { name: "Price scalar", expected: "malformed_supported_object", mutate: (authority) => { authority.item.price = "invalid"; } },
      { name: "Price object absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.price.object; } },
      { name: "Price object wrong", expected: "malformed_supported_object", mutate: (authority) => { authority.price.object = "plan"; } },
      { name: "Price livemode absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.price.livemode; } },
      { name: "Price live", expected: "malformed_supported_object", mutate: (authority) => { authority.price.livemode = true; } },
      { name: "recurring absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.price.recurring; } },
      { name: "recurring null", expected: "malformed_supported_object", mutate: (authority) => { authority.price.recurring = null; } },
      { name: "recurring array", expected: "malformed_supported_object", mutate: (authority) => { authority.price.recurring = []; } },
      { name: "recurring scalar", expected: "malformed_supported_object", mutate: (authority) => { authority.price.recurring = "month"; } },
      { name: "Price ID absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.price.id; } },
      { name: "Price ID noncanonical", expected: "malformed_supported_object", mutate: (authority) => { authority.price.id = "price_bad-hyphen"; } },
      { name: "Price ID non-string", expected: "malformed_supported_object", mutate: (authority) => { authority.price.id = 7; } },
      { name: "configured Price disagreement", expected: "price_mismatch", mutate: (authority) => { authority.price.id = "price_c5r6i"; } },
      { name: "Product absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.price.product; } },
      { name: "Product null", expected: "malformed_supported_object", mutate: (authority) => { authority.price.product = null; } },
      { name: "Product array", expected: "malformed_supported_object", mutate: (authority) => { authority.price.product = []; } },
      { name: "Product scalar", expected: "malformed_supported_object", mutate: (authority) => { authority.price.product = "invalid"; } },
      { name: "Product object absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.product.object; } },
      { name: "Product object wrong", expected: "malformed_supported_object", mutate: (authority) => { authority.product.object = "deleted_product"; } },
      { name: "Product livemode absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.product.livemode; } },
      { name: "Product live", expected: "malformed_supported_object", mutate: (authority) => { authority.product.livemode = true; } },
      { name: "Product deletion sentinel", expected: "malformed_supported_object", mutate: (authority) => { authority.product.deleted = true; } },
      { name: "Product ID absent", expected: "malformed_supported_object", mutate: (authority) => { delete authority.product.id; } },
      { name: "Product ID noncanonical", expected: "malformed_supported_object", mutate: (authority) => { authority.product.id = "prod_bad-hyphen"; } },
      { name: "Product ID non-string", expected: "malformed_supported_object", mutate: (authority) => { authority.product.id = 7; } },
      { name: "configured Product disagreement", expected: "product_mismatch", mutate: (authority) => { authority.product.id = "prod_c5r6i"; } },
    ];

    for (const row of cases) {
      const authority = makeItemAuthorityFixture();
      row.mutate(authority);
      stripeMock.reset();
      stripeMock.configure({
        subscription: authority.subscription,
        sessionList: {
          object: "list",
          has_more: false,
          data: [authority.fixtures.session],
        },
        customer: authority.fixtures.customer,
      });
      const resultPromise = createStripeWebhookGateway(config).loadAuthorityBundle(envelope());

      await expect(resultPromise).resolves.toEqual({
        valid: false,
        failureCode: row.expected,
        reference: {
          sessionId: "cs_test_c5r6a",
          subscriptionId: "sub_c5r6a",
          customerId: "cus_c5r6a",
        },
      });
      const result = await resultPromise;

      expect(result.valid).toBe(false);
      expect(result.failureCode).toBe(row.expected);
      expect(result.reference.sessionId).toBe("cs_test_c5r6a");
      expect(result.reference.subscriptionId).toBe("sub_c5r6a");
      expect(result.reference.customerId).toBe("cus_c5r6a");
      expect(stripeMock.trace).toEqual([
        "subscriptions.retrieve:[\"sub_c5r6a\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]",
        "checkout.sessions.list:[{\"subscription\":\"sub_c5r6a\",\"limit\":2}]",
        "customers.retrieve:[\"cus_c5r6a\"]",
      ]);
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith(
        "sub_c5r6a",
        { expand: ["customer", "items.data.price.product"] },
      );
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledWith({
        subscription: "sub_c5r6a",
        limit: 2,
      });
      expect(stripeMock.customersRetrieve).toHaveBeenCalledWith("cus_c5r6a");
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledTimes(1);
      expect(stripeMock.customersRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.invoicesRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.constructEvent).toHaveBeenCalledTimes(0);
    }
  });

  it("C5R6J Invoice paid and payment-failed authority classification evidence", async () => {
    type InvoiceEventType = "invoice.paid" | "invoice.payment_failed";
    type ReferenceClass = "blank" | "canonical";
    type TraceClass = "none" | "invoice_only" | "parent_disagreement" | "canonical_without_customer" | "full";
    const makeInvoiceAuthorityFixture = (
      eventType: InvoiceEventType,
      paid: boolean,
    ) => {
      const fixtures = baseline();
      const parentSubscription: Record<string, unknown> = {
        object: "subscription",
        id: "sub_c5r6a",
        livemode: false,
      };
      const subscriptionDetails: Record<string, unknown> = {
        subscription: parentSubscription,
      };
      const parent: Record<string, unknown> = {
        type: "subscription_details",
        subscription_details: subscriptionDetails,
      };
      const invoiceCustomer: Record<string, unknown> = {
        object: "customer",
        id: "cus_c5r6a",
        livemode: false,
        metadata: { ...customerMetadata },
        deleted: undefined,
      };
      const invoice: Record<string, unknown> = {
        object: "invoice",
        id: "in_c5r6j",
        livemode: false,
        customer: invoiceCustomer,
        parent,
        paid,
      };
      const signed: Record<string, unknown> = {
        object: "invoice",
        id: "in_c5r6j",
      };
      const provider: { invoice: unknown } = { invoice };

      return {
        eventType,
        fixtures,
        signed,
        provider,
        invoice,
        invoiceCustomer,
        parent,
        subscriptionDetails,
        parentSubscription,
      };
    };

    type InvoiceAuthority = ReturnType<typeof makeInvoiceAuthorityFixture>;
    type Case = {
      name: string;
      eventType: InvoiceEventType;
      paid: boolean;
      mutation: string;
      expected: "valid" | "malformed_supported_object" | "identifier_mismatch";
      reference: ReferenceClass;
      trace: TraceClass;
      mutate?: (authority: InvoiceAuthority) => void;
    };
    const cases: Case[] = [
      { name: "canonical invoice.paid", eventType: "invoice.paid", paid: true, mutation: "none", expected: "valid", reference: "canonical", trace: "full" },
      { name: "canonical invoice.payment_failed", eventType: "invoice.payment_failed", paid: false, mutation: "none", expected: "valid", reference: "canonical", trace: "full" },
      { name: "signed Invoice object wrong", eventType: "invoice.paid", paid: true, mutation: 'authority.signed.object = "charge"', expected: "malformed_supported_object", reference: "blank", trace: "none", mutate: (authority) => { authority.signed.object = "charge"; } },
      { name: "signed Invoice ID noncanonical", eventType: "invoice.paid", paid: true, mutation: 'authority.signed.id = "in_bad-hyphen"', expected: "malformed_supported_object", reference: "blank", trace: "none", mutate: (authority) => { authority.signed.id = "in_bad-hyphen"; } },
      { name: "provider Invoice absent", eventType: "invoice.paid", paid: true, mutation: "authority.provider.invoice = undefined", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.provider.invoice = undefined; } },
      { name: "provider Invoice null", eventType: "invoice.paid", paid: true, mutation: "authority.provider.invoice = null", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.provider.invoice = null; } },
      { name: "provider Invoice array", eventType: "invoice.paid", paid: true, mutation: "authority.provider.invoice = []", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.provider.invoice = []; } },
      { name: "provider Invoice scalar", eventType: "invoice.paid", paid: true, mutation: 'authority.provider.invoice = "invalid"', expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.provider.invoice = "invalid"; } },
      { name: "retrieved Invoice object absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.invoice.object", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { delete authority.invoice.object; } },
      { name: "retrieved Invoice object wrong", eventType: "invoice.paid", paid: true, mutation: 'authority.invoice.object = "credit_note"', expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.invoice.object = "credit_note"; } },
      { name: "retrieved Invoice livemode absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.invoice.livemode", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { delete authority.invoice.livemode; } },
      { name: "retrieved Invoice live", eventType: "invoice.paid", paid: true, mutation: "authority.invoice.livemode = true", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.invoice.livemode = true; } },
      { name: "Invoice parent absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.invoice.parent", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { delete authority.invoice.parent; } },
      { name: "Invoice parent null", eventType: "invoice.paid", paid: true, mutation: "authority.invoice.parent = null", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.invoice.parent = null; } },
      { name: "Invoice parent array", eventType: "invoice.paid", paid: true, mutation: "authority.invoice.parent = []", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.invoice.parent = []; } },
      { name: "Invoice parent scalar", eventType: "invoice.paid", paid: true, mutation: 'authority.invoice.parent = "invalid"', expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.invoice.parent = "invalid"; } },
      { name: "Invoice parent type absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.parent.type", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { delete authority.parent.type; } },
      { name: "Invoice parent type wrong", eventType: "invoice.paid", paid: true, mutation: 'authority.parent.type = "quote_details"', expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.parent.type = "quote_details"; } },
      { name: "subscription_details absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.parent.subscription_details", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { delete authority.parent.subscription_details; } },
      { name: "subscription_details null", eventType: "invoice.paid", paid: true, mutation: "authority.parent.subscription_details = null", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.parent.subscription_details = null; } },
      { name: "subscription_details array", eventType: "invoice.paid", paid: true, mutation: "authority.parent.subscription_details = []", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.parent.subscription_details = []; } },
      { name: "subscription_details scalar", eventType: "invoice.paid", paid: true, mutation: 'authority.parent.subscription_details = "invalid"', expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.parent.subscription_details = "invalid"; } },
      { name: "parent Subscription absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.subscriptionDetails.subscription", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { delete authority.subscriptionDetails.subscription; } },
      { name: "parent Subscription null", eventType: "invoice.paid", paid: true, mutation: "authority.subscriptionDetails.subscription = null", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.subscriptionDetails.subscription = null; } },
      { name: "parent Subscription array", eventType: "invoice.paid", paid: true, mutation: "authority.subscriptionDetails.subscription = []", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.subscriptionDetails.subscription = []; } },
      { name: "parent Subscription scalar", eventType: "invoice.paid", paid: true, mutation: 'authority.subscriptionDetails.subscription = "invalid"', expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.subscriptionDetails.subscription = "invalid"; } },
      { name: "parent Subscription object absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.parentSubscription.object", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { delete authority.parentSubscription.object; } },
      { name: "parent Subscription object wrong", eventType: "invoice.paid", paid: true, mutation: 'authority.parentSubscription.object = "subscription_schedule"', expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.parentSubscription.object = "subscription_schedule"; } },
      { name: "parent Subscription livemode absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.parentSubscription.livemode", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { delete authority.parentSubscription.livemode; } },
      { name: "parent Subscription live", eventType: "invoice.paid", paid: true, mutation: "authority.parentSubscription.livemode = true", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.parentSubscription.livemode = true; } },
      { name: "parent Subscription ID absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.parentSubscription.id", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { delete authority.parentSubscription.id; } },
      { name: "parent Subscription ID noncanonical", eventType: "invoice.paid", paid: true, mutation: 'authority.parentSubscription.id = "sub_bad-hyphen"', expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.parentSubscription.id = "sub_bad-hyphen"; } },
      { name: "expanded parent Subscription disagreement", eventType: "invoice.paid", paid: true, mutation: 'authority.parentSubscription.id = "sub_c5r6j"', expected: "identifier_mismatch", reference: "canonical", trace: "parent_disagreement", mutate: (authority) => { authority.parentSubscription.id = "sub_c5r6j"; } },
      { name: "retrieved Invoice ID absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.invoice.id", expected: "identifier_mismatch", reference: "blank", trace: "invoice_only", mutate: (authority) => { delete authority.invoice.id; } },
      { name: "retrieved Invoice ID disagreement", eventType: "invoice.paid", paid: true, mutation: 'authority.invoice.id = "in_c5r6k"', expected: "identifier_mismatch", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.invoice.id = "in_c5r6k"; } },
      { name: "invoice.paid paid flag absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.invoice.paid", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { delete authority.invoice.paid; } },
      { name: "invoice.paid paid flag false", eventType: "invoice.paid", paid: true, mutation: "authority.invoice.paid = false", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.invoice.paid = false; } },
      { name: "invoice.payment_failed paid flag absent", eventType: "invoice.payment_failed", paid: false, mutation: "delete authority.invoice.paid", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { delete authority.invoice.paid; } },
      { name: "invoice.payment_failed paid flag true", eventType: "invoice.payment_failed", paid: false, mutation: "authority.invoice.paid = true", expected: "malformed_supported_object", reference: "blank", trace: "invoice_only", mutate: (authority) => { authority.invoice.paid = true; } },
      { name: "Invoice Customer absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.invoice.customer", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { delete authority.invoice.customer; } },
      { name: "Invoice Customer null", eventType: "invoice.paid", paid: true, mutation: "authority.invoice.customer = null", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoice.customer = null; } },
      { name: "Invoice Customer array", eventType: "invoice.paid", paid: true, mutation: "authority.invoice.customer = []", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoice.customer = []; } },
      { name: "Invoice Customer scalar", eventType: "invoice.paid", paid: true, mutation: 'authority.invoice.customer = "invalid"', expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoice.customer = "invalid"; } },
      { name: "Invoice Customer generic object", eventType: "invoice.paid", paid: true, mutation: 'authority.invoice.customer = { id: "cus_c5r6a" }', expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoice.customer = { id: "cus_c5r6a" }; } },
      { name: "Invoice Customer object wrong", eventType: "invoice.paid", paid: true, mutation: 'authority.invoiceCustomer.object = "account"', expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoiceCustomer.object = "account"; } },
      { name: "Invoice Customer livemode absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.invoiceCustomer.livemode", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { delete authority.invoiceCustomer.livemode; } },
      { name: "Invoice Customer live", eventType: "invoice.paid", paid: true, mutation: "authority.invoiceCustomer.livemode = true", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoiceCustomer.livemode = true; } },
      { name: "Invoice Customer deleted true", eventType: "invoice.paid", paid: true, mutation: "authority.invoiceCustomer.deleted = true", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoiceCustomer.deleted = true; } },
      { name: "Invoice Customer deleted null", eventType: "invoice.paid", paid: true, mutation: "authority.invoiceCustomer.deleted = null", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoiceCustomer.deleted = null; } },
      { name: "Invoice Customer deleted false", eventType: "invoice.paid", paid: true, mutation: "authority.invoiceCustomer.deleted = false", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoiceCustomer.deleted = false; } },
      { name: "Invoice Customer metadata absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.invoiceCustomer.metadata", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { delete authority.invoiceCustomer.metadata; } },
      { name: "Invoice Customer metadata null", eventType: "invoice.paid", paid: true, mutation: "authority.invoiceCustomer.metadata = null", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoiceCustomer.metadata = null; } },
      { name: "Invoice Customer metadata array", eventType: "invoice.paid", paid: true, mutation: "authority.invoiceCustomer.metadata = []", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoiceCustomer.metadata = []; } },
      { name: "Invoice Customer metadata scalar", eventType: "invoice.paid", paid: true, mutation: 'authority.invoiceCustomer.metadata = "invalid"', expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoiceCustomer.metadata = "invalid"; } },
      { name: "Invoice Customer metadata non-string value", eventType: "invoice.paid", paid: true, mutation: "authority.invoiceCustomer.metadata = { agentkip_schema: 1, clerk_subject: \"user_c5r6a\" }", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoiceCustomer.metadata = { agentkip_schema: 1, clerk_subject: "user_c5r6a" }; } },
      { name: "Invoice Customer ID absent", eventType: "invoice.paid", paid: true, mutation: "delete authority.invoiceCustomer.id", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { delete authority.invoiceCustomer.id; } },
      { name: "Invoice Customer ID noncanonical", eventType: "invoice.paid", paid: true, mutation: 'authority.invoiceCustomer.id = "cus_bad-hyphen"', expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoiceCustomer.id = "cus_bad-hyphen"; } },
      { name: "Invoice Customer disagreement", eventType: "invoice.paid", paid: true, mutation: 'authority.invoiceCustomer.id = "cus_c5r6j"', expected: "identifier_mismatch", reference: "canonical", trace: "canonical_without_customer", mutate: (authority) => { authority.invoiceCustomer.id = "cus_c5r6j"; } },
    ];

    expect(cases).toHaveLength(58);
    expect(cases.filter((row) => row.expected === "valid")).toHaveLength(2);
    expect(cases.filter((row) => row.expected === "malformed_supported_object")).toHaveLength(52);
    expect(cases.filter((row) => row.expected === "identifier_mismatch")).toHaveLength(4);

    let executed = 0;
    let validExecuted = 0;
    let malformedExecuted = 0;
    let identifierMismatchExecuted = 0;
    const canonicalReference = {
      sessionId: "cs_test_c5r6a",
      subscriptionId: "sub_c5r6a",
      customerId: "cus_c5r6a",
    };
    const blankReference = {
      sessionId: "",
      subscriptionId: null,
      customerId: null,
    };
    const invoiceRetrieveArguments = {
      expand: ["customer", "parent.subscription_details.subscription", "lines.data.price.product"],
    };
    const subscriptionRetrieveArguments = {
      expand: ["customer", "items.data.price.product"],
    };

    for (const row of cases) {
      const authority = makeInvoiceAuthorityFixture(row.eventType, row.paid);
      row.mutate?.(authority);
      stripeMock.reset();
      stripeMock.configure({
        subscription: authority.fixtures.subscription,
        sessionList: {
          object: "list",
          has_more: false,
          data: [authority.fixtures.session],
        },
        customer: authority.fixtures.customer,
        invoice: authority.provider.invoice,
      });
      const resultPromise = createStripeWebhookGateway(config).loadAuthorityBundle({
        id: "evt_c5r6j",
        createdAt: new Date("2026-07-14T00:00:00.000Z"),
        livemode: false,
        object: authority.signed,
        type: row.eventType,
      });
      const expectedResult = row.expected === "valid"
        ? {
            valid: true,
            reference: canonicalReference,
            status: "active",
            clerkSubject: "user_c5r6a",
            checkoutRequestId: "50000000-0000-4000-8000-00000000006a",
            priceId: "price_c5unit",
            productId: "prod_c5unit",
          }
        : {
            valid: false,
            failureCode: row.expected,
            reference: row.reference === "blank" ? blankReference : canonicalReference,
          };
      await expect(resultPromise).resolves.toEqual(expectedResult);
      const result = await resultPromise;

      if (row.expected === "valid") {
        expect(result.valid).toBe(true);
        expect(Object.hasOwn(result, "failureCode")).toBe(false);
        expect(result.reference.sessionId).toBe("cs_test_c5r6a");
        expect(result.reference.subscriptionId).toBe("sub_c5r6a");
        expect(result.reference.customerId).toBe("cus_c5r6a");
        expect(result.status).toBe("active");
        expect(result.clerkSubject).toBe("user_c5r6a");
        expect(result.checkoutRequestId).toBe("50000000-0000-4000-8000-00000000006a");
        expect(result.priceId).toBe("price_c5unit");
        expect(result.productId).toBe("prod_c5unit");
      } else {
        const expectedReference = row.reference === "blank" ? blankReference : canonicalReference;
        expect(result.valid).toBe(false);
        expect(result.failureCode).toBe(row.expected);
        expect(result.reference.sessionId).toBe(expectedReference.sessionId);
        expect(result.reference.subscriptionId).toBe(expectedReference.subscriptionId);
        expect(result.reference.customerId).toBe(expectedReference.customerId);
      }

      if (row.trace === "none") {
        expect(stripeMock.trace).toEqual([]);
      } else if (row.trace === "invoice_only") {
        expect(stripeMock.trace).toEqual([
          "invoices.retrieve:[\"in_c5r6j\",{\"expand\":[\"customer\",\"parent.subscription_details.subscription\",\"lines.data.price.product\"]}]",
        ]);
        expect(stripeMock.invoicesRetrieve).toHaveBeenCalledWith("in_c5r6j", invoiceRetrieveArguments);
      } else if (row.trace === "parent_disagreement") {
        expect(stripeMock.trace).toEqual([
          "invoices.retrieve:[\"in_c5r6j\",{\"expand\":[\"customer\",\"parent.subscription_details.subscription\",\"lines.data.price.product\"]}]",
          "subscriptions.retrieve:[\"sub_c5r6j\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]",
          "checkout.sessions.list:[{\"subscription\":\"sub_c5r6j\",\"limit\":2}]",
        ]);
        expect(stripeMock.invoicesRetrieve).toHaveBeenCalledWith("in_c5r6j", invoiceRetrieveArguments);
        expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith("sub_c5r6j", subscriptionRetrieveArguments);
        expect(stripeMock.checkoutSessionsList).toHaveBeenCalledWith({ subscription: "sub_c5r6j", limit: 2 });
      } else if (row.trace === "canonical_without_customer") {
        expect(stripeMock.trace).toEqual([
          "invoices.retrieve:[\"in_c5r6j\",{\"expand\":[\"customer\",\"parent.subscription_details.subscription\",\"lines.data.price.product\"]}]",
          "subscriptions.retrieve:[\"sub_c5r6a\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]",
          "checkout.sessions.list:[{\"subscription\":\"sub_c5r6a\",\"limit\":2}]",
        ]);
        expect(stripeMock.invoicesRetrieve).toHaveBeenCalledWith("in_c5r6j", invoiceRetrieveArguments);
        expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith("sub_c5r6a", subscriptionRetrieveArguments);
        expect(stripeMock.checkoutSessionsList).toHaveBeenCalledWith({ subscription: "sub_c5r6a", limit: 2 });
      } else {
        expect(stripeMock.trace).toEqual([
          "invoices.retrieve:[\"in_c5r6j\",{\"expand\":[\"customer\",\"parent.subscription_details.subscription\",\"lines.data.price.product\"]}]",
          "subscriptions.retrieve:[\"sub_c5r6a\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]",
          "checkout.sessions.list:[{\"subscription\":\"sub_c5r6a\",\"limit\":2}]",
          "customers.retrieve:[\"cus_c5r6a\"]",
        ]);
        expect(stripeMock.invoicesRetrieve).toHaveBeenCalledWith("in_c5r6j", invoiceRetrieveArguments);
        expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith("sub_c5r6a", subscriptionRetrieveArguments);
        expect(stripeMock.checkoutSessionsList).toHaveBeenCalledWith({ subscription: "sub_c5r6a", limit: 2 });
        expect(stripeMock.customersRetrieve).toHaveBeenCalledWith("cus_c5r6a");
      }
      expect(stripeMock.invoicesRetrieve).toHaveBeenCalledTimes(row.trace === "none" ? 0 : 1);
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledTimes(row.trace === "none" || row.trace === "invoice_only" ? 0 : 1);
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledTimes(row.trace === "none" || row.trace === "invoice_only" ? 0 : 1);
      expect(stripeMock.customersRetrieve).toHaveBeenCalledTimes(row.trace === "full" ? 1 : 0);
      expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.constructEvent).toHaveBeenCalledTimes(0);

      executed += 1;
      if (row.expected === "valid") validExecuted += 1;
      if (row.expected === "malformed_supported_object") malformedExecuted += 1;
      if (row.expected === "identifier_mismatch") identifierMismatchExecuted += 1;
    }

    expect(executed).toBe(58);
    expect(validExecuted).toBe(2);
    expect(malformedExecuted).toBe(52);
    expect(identifierMismatchExecuted).toBe(4);
  });

  it("C5R6K Checkout Session authority classification evidence", async () => {
    type ReferenceClass = "blank" | "canonical" | "session_partial" | "session_disagreement" | "subscription_partial" | "subscription_disagreement";
    type TraceClass = "none" | "session_only" | "canonical_without_customer" | "expanded_subscription_disagreement" | "full";
    const makeCheckoutSessionAuthorityFixture = () => {
      const fixtures = baseline();

      const sessionSubscription: Record<string, unknown> = {
        object: "subscription",
        id: "sub_c5r6a",
        livemode: false,
      };

      const session: Record<string, unknown> = {
        object: "checkout.session",
        id: "cs_test_c5r6a",
        livemode: false,
        mode: "subscription",
        customer: fixtures.session.customer,
        subscription: sessionSubscription,
        metadata: { ...checkoutMetadata },
      };

      const subscription: Record<string, unknown> = {
        ...fixtures.subscription,
      };

      const signed: Record<string, unknown> = {
        object: "checkout.session",
        id: "cs_test_c5r6a",
      };

      const provider: {
        session: unknown;
        subscription: unknown;
      } = {
        session,
        subscription,
      };

      return {
        fixtures,
        signed,
        provider,
        session,
        sessionSubscription,
        subscription,
      };
    };

    type CheckoutSessionAuthority = ReturnType<typeof makeCheckoutSessionAuthorityFixture>;
    type Expected = "valid" | "malformed_supported_object" | "identifier_mismatch";
    type Case = {
      name: string;
      mutation: string;
      expected: Expected;
      reference: ReferenceClass;
      trace: TraceClass;
      calls: [number, number, number, number, number, number];
      mutate?: (authority: CheckoutSessionAuthority) => void;
    };
    const cases: Case[] = [
      { name: "canonical control", mutation: "none", expected: "valid", reference: "canonical", trace: "full", calls: [1, 1, 0, 1, 0, 0] },
      { name: "signed Session object wrong", mutation: 'authority.signed.object = "payment_intent"', expected: "malformed_supported_object", reference: "blank", trace: "none", calls: [0, 0, 0, 0, 0, 0], mutate: (authority) => { authority.signed.object = "payment_intent"; } },
      { name: "signed Session ID noncanonical", mutation: 'authority.signed.id = "cs_test_bad-hyphen"', expected: "malformed_supported_object", reference: "blank", trace: "none", calls: [0, 0, 0, 0, 0, 0], mutate: (authority) => { authority.signed.id = "cs_test_bad-hyphen"; } },
      { name: "provider Session absent", mutation: "authority.provider.session = undefined", expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { authority.provider.session = undefined; } },
      { name: "provider Session null", mutation: "authority.provider.session = null", expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { authority.provider.session = null; } },
      { name: "provider Session array", mutation: "authority.provider.session = []", expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { authority.provider.session = []; } },
      { name: "provider Session scalar", mutation: 'authority.provider.session = "invalid"', expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { authority.provider.session = "invalid"; } },
      { name: "retrieved Session object absent", mutation: "delete authority.session.object", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { delete authority.session.object; } },
      { name: "retrieved Session object wrong", mutation: 'authority.session.object = "checkout.session.deleted"', expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.session.object = "checkout.session.deleted"; } },
      { name: "retrieved Session livemode absent", mutation: "delete authority.session.livemode", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { delete authority.session.livemode; } },
      { name: "retrieved Session live", mutation: "authority.session.livemode = true", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.session.livemode = true; } },
      { name: "retrieved Session mode absent", mutation: "delete authority.session.mode", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { delete authority.session.mode; } },
      { name: "retrieved Session mode wrong", mutation: 'authority.session.mode = "payment"', expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.session.mode = "payment"; } },
      { name: "retrieved Session ID absent", mutation: "delete authority.session.id", expected: "malformed_supported_object", reference: "session_partial", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { delete authority.session.id; } },
      { name: "retrieved Session ID noncanonical", mutation: 'authority.session.id = "cs_test_bad-hyphen"', expected: "malformed_supported_object", reference: "session_partial", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.session.id = "cs_test_bad-hyphen"; } },
      { name: "retrieved Session ID disagreement", mutation: 'authority.session.id = "cs_test_c5r6k"', expected: "identifier_mismatch", reference: "session_disagreement", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.session.id = "cs_test_c5r6k"; } },
      { name: "expanded Session Subscription absent", mutation: "delete authority.session.subscription", expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { delete authority.session.subscription; } },
      { name: "expanded Session Subscription null", mutation: "authority.session.subscription = null", expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { authority.session.subscription = null; } },
      { name: "expanded Session Subscription array", mutation: "authority.session.subscription = []", expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { authority.session.subscription = []; } },
      { name: "expanded Session Subscription scalar", mutation: 'authority.session.subscription = "invalid"', expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { authority.session.subscription = "invalid"; } },
      { name: "expanded Session Subscription object absent", mutation: "delete authority.sessionSubscription.object", expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { delete authority.sessionSubscription.object; } },
      { name: "expanded Session Subscription object wrong", mutation: 'authority.sessionSubscription.object = "subscription_schedule"', expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { authority.sessionSubscription.object = "subscription_schedule"; } },
      { name: "expanded Session Subscription livemode absent", mutation: "delete authority.sessionSubscription.livemode", expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { delete authority.sessionSubscription.livemode; } },
      { name: "expanded Session Subscription live", mutation: "authority.sessionSubscription.livemode = true", expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { authority.sessionSubscription.livemode = true; } },
      { name: "expanded Session Subscription ID absent", mutation: "delete authority.sessionSubscription.id", expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { delete authority.sessionSubscription.id; } },
      { name: "expanded Session Subscription ID noncanonical", mutation: 'authority.sessionSubscription.id = "sub_bad-hyphen"', expected: "malformed_supported_object", reference: "blank", trace: "session_only", calls: [1, 0, 0, 0, 0, 0], mutate: (authority) => { authority.sessionSubscription.id = "sub_bad-hyphen"; } },
      { name: "expanded Session Subscription disagreement", mutation: 'authority.sessionSubscription.id = "sub_c5r6k"', expected: "identifier_mismatch", reference: "canonical", trace: "expanded_subscription_disagreement", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.sessionSubscription.id = "sub_c5r6k"; } },
      { name: "provider Subscription absent", mutation: "authority.provider.subscription = undefined", expected: "malformed_supported_object", reference: "subscription_partial", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.provider.subscription = undefined; } },
      { name: "provider Subscription null", mutation: "authority.provider.subscription = null", expected: "malformed_supported_object", reference: "subscription_partial", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.provider.subscription = null; } },
      { name: "provider Subscription array", mutation: "authority.provider.subscription = []", expected: "malformed_supported_object", reference: "subscription_partial", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.provider.subscription = []; } },
      { name: "provider Subscription scalar", mutation: 'authority.provider.subscription = "invalid"', expected: "malformed_supported_object", reference: "subscription_partial", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.provider.subscription = "invalid"; } },
      { name: "retrieved Subscription object absent", mutation: "delete authority.subscription.object", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { delete authority.subscription.object; } },
      { name: "retrieved Subscription object wrong", mutation: 'authority.subscription.object = "subscription_schedule"', expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.subscription.object = "subscription_schedule"; } },
      { name: "retrieved Subscription livemode absent", mutation: "delete authority.subscription.livemode", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { delete authority.subscription.livemode; } },
      { name: "retrieved Subscription live", mutation: "authority.subscription.livemode = true", expected: "malformed_supported_object", reference: "canonical", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.subscription.livemode = true; } },
      { name: "retrieved Subscription ID absent", mutation: "delete authority.subscription.id", expected: "malformed_supported_object", reference: "subscription_partial", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { delete authority.subscription.id; } },
      { name: "retrieved Subscription ID noncanonical", mutation: 'authority.subscription.id = "sub_bad-hyphen"', expected: "malformed_supported_object", reference: "subscription_partial", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.subscription.id = "sub_bad-hyphen"; } },
      { name: "retrieved Subscription ID disagreement", mutation: 'authority.subscription.id = "sub_c5r6k"', expected: "identifier_mismatch", reference: "subscription_disagreement", trace: "canonical_without_customer", calls: [1, 1, 0, 0, 0, 0], mutate: (authority) => { authority.subscription.id = "sub_c5r6k"; } },
    ];

    expect(cases).toHaveLength(38);
    expect(cases.filter((row) => row.expected === "valid")).toHaveLength(1);
    expect(cases.filter((row) => row.expected === "malformed_supported_object")).toHaveLength(34);
    expect(cases.filter((row) => row.expected === "identifier_mismatch")).toHaveLength(3);

    const references = {
      blank: { sessionId: "", subscriptionId: null, customerId: null },
      canonical: { sessionId: "cs_test_c5r6a", subscriptionId: "sub_c5r6a", customerId: "cus_c5r6a" },
      session_partial: { sessionId: "", subscriptionId: "sub_c5r6a", customerId: "cus_c5r6a" },
      session_disagreement: { sessionId: "cs_test_c5r6k", subscriptionId: "sub_c5r6a", customerId: "cus_c5r6a" },
      subscription_partial: { sessionId: "cs_test_c5r6a", subscriptionId: null, customerId: "cus_c5r6a" },
      subscription_disagreement: { sessionId: "cs_test_c5r6a", subscriptionId: "sub_c5r6k", customerId: "cus_c5r6a" },
    };
    const checkoutSessionRetrieveArguments = {
      expand: ["customer", "subscription", "line_items.data.price.product"],
    };
    const subscriptionRetrieveArguments = {
      expand: ["customer", "items.data.price.product"],
    };
    let executed = 0;
    let validExecuted = 0;
    let malformedExecuted = 0;
    let identifierMismatchExecuted = 0;

    for (const row of cases) {
      const authority = makeCheckoutSessionAuthorityFixture();
      row.mutate?.(authority);
      stripeMock.reset();
      stripeMock.configure({
        subscription: authority.provider.subscription,
        sessionList: {
          object: "list",
          has_more: false,
          data: [authority.session],
        },
        customer: authority.fixtures.customer,
        session: authority.provider.session,
      });
      const resultPromise = createStripeWebhookGateway(config).loadAuthorityBundle({
        id: "evt_c5r6k",
        type: "checkout.session.completed",
        createdAt: new Date("2026-07-14T00:00:00.000Z"),
        livemode: false,
        object: authority.signed,
      });
      const expectedResult = row.expected === "valid"
        ? {
            valid: true,
            reference: references.canonical,
            status: "active",
            clerkSubject: "user_c5r6a",
            checkoutRequestId: "50000000-0000-4000-8000-00000000006a",
            priceId: "price_c5unit",
            productId: "prod_c5unit",
          }
        : {
            valid: false,
            failureCode: row.expected,
            reference: references[row.reference],
          };
      await expect(resultPromise).resolves.toEqual(expectedResult);
      const result = await resultPromise;

      if (row.expected === "valid") {
        expect(result.valid).toBe(true);
        expect(Object.hasOwn(result, "failureCode")).toBe(false);
        expect(result.reference.sessionId).toBe("cs_test_c5r6a");
        expect(result.reference.subscriptionId).toBe("sub_c5r6a");
        expect(result.reference.customerId).toBe("cus_c5r6a");
        expect(result.status).toBe("active");
        expect(result.clerkSubject).toBe("user_c5r6a");
        expect(result.checkoutRequestId).toBe("50000000-0000-4000-8000-00000000006a");
        expect(result.priceId).toBe("price_c5unit");
        expect(result.productId).toBe("prod_c5unit");
      } else {
        const expectedReference = references[row.reference];
        expect(result.valid).toBe(false);
        expect(result.failureCode).toBe(row.expected);
        expect(result.reference.sessionId).toBe(expectedReference.sessionId);
        expect(result.reference.subscriptionId).toBe(expectedReference.subscriptionId);
        expect(result.reference.customerId).toBe(expectedReference.customerId);
      }

      if (row.trace === "none") {
        expect(stripeMock.trace).toEqual([]);
      } else if (row.trace === "session_only") {
        expect(stripeMock.trace).toEqual([
          "checkout.sessions.retrieve:[\"cs_test_c5r6a\",{\"expand\":[\"customer\",\"subscription\",\"line_items.data.price.product\"]}]",
        ]);
        expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledWith("cs_test_c5r6a", checkoutSessionRetrieveArguments);
      } else if (row.trace === "canonical_without_customer") {
        expect(stripeMock.trace).toEqual([
          "checkout.sessions.retrieve:[\"cs_test_c5r6a\",{\"expand\":[\"customer\",\"subscription\",\"line_items.data.price.product\"]}]",
          "subscriptions.retrieve:[\"sub_c5r6a\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]",
        ]);
        expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledWith("cs_test_c5r6a", checkoutSessionRetrieveArguments);
        expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith("sub_c5r6a", subscriptionRetrieveArguments);
      } else if (row.trace === "expanded_subscription_disagreement") {
        expect(stripeMock.trace).toEqual([
          "checkout.sessions.retrieve:[\"cs_test_c5r6a\",{\"expand\":[\"customer\",\"subscription\",\"line_items.data.price.product\"]}]",
          "subscriptions.retrieve:[\"sub_c5r6k\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]",
        ]);
        expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledWith("cs_test_c5r6a", checkoutSessionRetrieveArguments);
        expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith("sub_c5r6k", subscriptionRetrieveArguments);
      } else {
        expect(stripeMock.trace).toEqual([
          "checkout.sessions.retrieve:[\"cs_test_c5r6a\",{\"expand\":[\"customer\",\"subscription\",\"line_items.data.price.product\"]}]",
          "subscriptions.retrieve:[\"sub_c5r6a\",{\"expand\":[\"customer\",\"items.data.price.product\"]}]",
          "customers.retrieve:[\"cus_c5r6a\"]",
        ]);
        expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledWith("cs_test_c5r6a", checkoutSessionRetrieveArguments);
        expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith("sub_c5r6a", subscriptionRetrieveArguments);
        expect(stripeMock.customersRetrieve).toHaveBeenCalledWith("cus_c5r6a");
      }
      expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledTimes(row.calls[0]);
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledTimes(row.calls[1]);
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledTimes(row.calls[2]);
      expect(stripeMock.customersRetrieve).toHaveBeenCalledTimes(row.calls[3]);
      expect(stripeMock.invoicesRetrieve).toHaveBeenCalledTimes(row.calls[4]);
      expect(stripeMock.constructEvent).toHaveBeenCalledTimes(row.calls[5]);

      executed += 1;
      if (row.expected === "valid") validExecuted += 1;
      if (row.expected === "malformed_supported_object") malformedExecuted += 1;
      if (row.expected === "identifier_mismatch") identifierMismatchExecuted += 1;
    }

    expect(executed).toBe(38);
    expect(validExecuted).toBe(1);
    expect(malformedExecuted).toBe(34);
    expect(identifierMismatchExecuted).toBe(3);
  });

  it("C5R6L Subscription created and deleted canonical gateway authority evidence", async () => {
    type SubscriptionGatewayCase = {
      eventId: "evt_c5r6l_created" | "evt_c5r6l_deleted";
      eventType: "customer.subscription.created" | "customer.subscription.deleted";
      providerStatus: "trialing" | "canceled";
      expectedStatus: "trialing" | "canceled";
    };
    const cases: [SubscriptionGatewayCase, SubscriptionGatewayCase] = [
      { eventId: "evt_c5r6l_created", eventType: "customer.subscription.created", providerStatus: "trialing", expectedStatus: "trialing" },
      { eventId: "evt_c5r6l_deleted", eventType: "customer.subscription.deleted", providerStatus: "canceled", expectedStatus: "canceled" },
    ];
    const subscriptionRetrieveArguments = {
      expand: [
        "customer",
        "items.data.price.product",
      ],
    };
    const checkoutSessionsListArguments = {
      subscription: "sub_c5r6a",
      limit: 2,
    };
    let executedRows = 0;
    let executedValidRows = 0;
    let executedCreatedRows = 0;
    let executedDeletedRows = 0;

    expect(cases.length).toBe(2);
    expect(cases.filter((row) => row.eventType === "customer.subscription.created").length).toBe(1);
    expect(cases.filter((row) => row.eventType === "customer.subscription.deleted").length).toBe(1);
    expect(cases.filter((row) => row.expectedStatus === "trialing").length).toBe(1);
    expect(cases.filter((row) => row.expectedStatus === "canceled").length).toBe(1);

    for (const row of cases) {
      const fixtures = baseline();
      const subscription = {
        ...fixtures.subscription,
        status: row.providerStatus,
      };
      stripeMock.reset();
      stripeMock.configure({
        subscription,
        sessionList: {
          object: "list",
          has_more: false,
          data: [fixtures.session],
        },
        customer: fixtures.customer,
      });
      const resultPromise = createStripeWebhookGateway(config).loadAuthorityBundle({
        id: row.eventId,
        type: row.eventType,
        createdAt: new Date("2026-07-14T00:00:00.000Z"),
        livemode: false,
        object: {
          object: "subscription",
          id: "sub_c5r6a",
        },
      });
      const expectedResult = {
        valid: true,
        reference: {
          sessionId: "cs_test_c5r6a",
          subscriptionId: "sub_c5r6a",
          customerId: "cus_c5r6a",
        },
        status: row.expectedStatus,
        clerkSubject: "user_c5r6a",
        checkoutRequestId: "50000000-0000-4000-8000-00000000006a",
        priceId: "price_c5unit",
        productId: "prod_c5unit",
      };

      await expect(resultPromise).resolves.toEqual(expectedResult);
      const result = await resultPromise;

      expect(result.valid).toBe(true);
      expect(Object.hasOwn(result, "failureCode")).toBe(false);
      expect(result.reference.sessionId).toBe("cs_test_c5r6a");
      expect(result.reference.subscriptionId).toBe("sub_c5r6a");
      expect(result.reference.customerId).toBe("cus_c5r6a");
      expect(result.status).toBe(row.expectedStatus);
      expect(result.clerkSubject).toBe("user_c5r6a");
      expect(result.checkoutRequestId).toBe("50000000-0000-4000-8000-00000000006a");
      expect(result.priceId).toBe("price_c5unit");
      expect(result.productId).toBe("prod_c5unit");
      expect(stripeMock.trace).toEqual([
        'subscriptions.retrieve:["sub_c5r6a",{"expand":["customer","items.data.price.product"]}]',
        'checkout.sessions.list:[{"subscription":"sub_c5r6a","limit":2}]',
        'customers.retrieve:["cus_c5r6a"]',
      ]);
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledWith("sub_c5r6a", subscriptionRetrieveArguments);
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledWith(checkoutSessionsListArguments);
      expect(stripeMock.customersRetrieve).toHaveBeenCalledWith("cus_c5r6a");
      expect(stripeMock.checkoutSessionsRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.subscriptionsRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.checkoutSessionsList).toHaveBeenCalledTimes(1);
      expect(stripeMock.customersRetrieve).toHaveBeenCalledTimes(1);
      expect(stripeMock.invoicesRetrieve).toHaveBeenCalledTimes(0);
      expect(stripeMock.constructEvent).toHaveBeenCalledTimes(0);

      executedRows += 1;
      executedValidRows += 1;
      if (row.eventType === "customer.subscription.created") executedCreatedRows += 1;
      if (row.eventType === "customer.subscription.deleted") executedDeletedRows += 1;
    }

    expect(executedRows).toBe(2);
    expect(executedValidRows).toBe(2);
    expect(executedCreatedRows).toBe(1);
    expect(executedDeletedRows).toBe(1);
  });
});
