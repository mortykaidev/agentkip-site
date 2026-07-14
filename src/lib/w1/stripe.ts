import Stripe from "stripe";
import type { W1CheckoutConfig, W1WebhookConfig } from "./config";
import { classifySupportedEvent } from "./webhook";

export interface StripePriceAuthority { readonly priceId: string; readonly productId: string; }
export interface StripeCustomerResult { readonly customerId: string; readonly livemode: false; readonly deleted: false; readonly metadata: { readonly agentkip_schema: "1"; readonly clerk_subject: string; }; }
export interface StripeCheckoutResult { readonly sessionId: string; readonly subscriptionId: string; readonly customerId: string; readonly priceId: string; readonly productId: string; readonly checkoutUrl: string; readonly createdAt: Date; readonly expiresAt: Date; readonly livemode: false; readonly mode: "subscription"; readonly quantity: 1; readonly metadata: { readonly agentkip_schema: "1"; readonly agentkip_product: "agentkip_first_friend"; readonly clerk_subject: string; readonly checkout_request_id: string; }; readonly subscriptionMetadata: { readonly agentkip_schema: "1"; readonly agentkip_product: "agentkip_first_friend"; readonly clerk_subject: string; readonly checkout_request_id: string; }; }
export interface VerifiedStripeEnvelope { id: string; type: string; createdAt: Date; livemode: boolean; object: Record<string, unknown>; }
export interface StripeAuthorityReference { sessionId: string; subscriptionId: string | null; customerId: string | null; }
export interface StripeAuthorityBundle { valid: boolean; failureCode?: "wrong_mode" | "malformed_supported_object" | "price_mismatch" | "product_mismatch" | "unknown_intent" | "unknown_customer" | "identifier_mismatch" | "metadata_mismatch"; reference: StripeAuthorityReference; status?: string; clerkSubject?: string; checkoutRequestId?: string; priceId?: string; productId?: string; }
export interface StripeCheckoutPort { validateConfiguredPrice(expected: StripePriceAuthority): Promise<void>; createCustomer(input: { subject: string }, idempotencyKey: string): Promise<StripeCustomerResult>; createCheckout(input: { customerId: string; subject: string; requestId: string; authority: StripePriceAuthority }, idempotencyKey: string): Promise<StripeCheckoutResult>; }
export interface StripeWebhookPort { verifyWebhook(rawText: string, signature: string): VerifiedStripeEnvelope; loadAuthorityBundle(envelope: VerifiedStripeEnvelope): Promise<StripeAuthorityBundle>; }

const metadata = (subject: string, request: string) => ({ agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: subject, checkout_request_id: request } as const);
const createClient = (stripeSecretKey: string) => new Stripe(stripeSecretKey, { apiVersion: Stripe.API_VERSION, appInfo: { name: "agentkip-site" } });
const canonicalHostedUrl = (value: unknown): value is string => { if (typeof value !== "string" || !value.startsWith("https://checkout.stripe.com/")) return false; try { const url = new URL(value); return url.protocol === "https:" && url.origin === "https://checkout.stripe.com" && url.hostname === "checkout.stripe.com" && url.host === "checkout.stripe.com" && url.port === "" && url.username === "" && url.password === "" && url.href === value && url.pathname.startsWith("/"); } catch { return false; } };
const exactMetadata = (value: Record<string, string> | null | undefined, expected: Record<string, string>) => value !== null && value !== undefined && Reflect.ownKeys(value).length === Object.keys(expected).length && Object.keys(expected).every((key) => Object.hasOwn(value, key) && value[key] === expected[key]);
const validEpoch = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;

export function createStripeCheckoutGateway(config: W1CheckoutConfig): StripeCheckoutPort {
  const stripe = createClient(config.stripeSecretKey);
  return {
    async validateConfiguredPrice(expected) { const price = await stripe.prices.retrieve(config.priceId, { expand: ["product"] }); const product = typeof price.product === "string" ? null : price.product; if (expected.priceId !== config.priceId || expected.productId !== config.productId || price.object !== "price" || !price.active || !price.recurring || price.livemode || price.id !== expected.priceId || !product || product.object !== "product" || product.deleted !== undefined || product.id !== expected.productId || !product.active || product.livemode) throw new Error("price unavailable"); },
    async createCustomer(input, idempotencyKey) { const customer = await stripe.customers.create({ metadata: { agentkip_schema: "1", clerk_subject: input.subject } }, { idempotencyKey }); if (customer.object !== "customer" || customer.livemode || customer.deleted !== undefined || !/^cus_[A-Za-z0-9]+$/.test(customer.id) || !exactMetadata(customer.metadata, { agentkip_schema: "1", clerk_subject: input.subject })) throw new Error("customer unavailable"); return { customerId: customer.id, livemode: false, deleted: false, metadata: { agentkip_schema: "1", clerk_subject: input.subject } }; },
    async createCheckout(input, idempotencyKey) {
      const requestMetadata = metadata(input.subject, input.requestId);
      if (!/^cus_[A-Za-z0-9]+$/.test(input.customerId) || !/^price_[A-Za-z0-9]+$/.test(input.authority.priceId) || !/^prod_[A-Za-z0-9]+$/.test(input.authority.productId) || input.authority.priceId !== config.priceId || input.authority.productId !== config.productId) throw new Error("checkout authority unavailable");
      const session = await stripe.checkout.sessions.create({ mode: "subscription", customer: input.customerId, line_items: [{ price: input.authority.priceId, quantity: 1 }], allow_promotion_codes: true, payment_method_collection: "if_required", success_url: config.successUrl, cancel_url: config.cancelUrl, metadata: requestMetadata, subscription_data: { metadata: requestMetadata } }, { idempotencyKey });
      const retrieved = await stripe.checkout.sessions.retrieve(session.id, { expand: ["customer", "line_items.data.price.product"] });
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      if (typeof subscriptionId !== "string" || !/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) throw new Error("checkout unavailable");
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["customer", "items.data.price.product"] }); const customer = retrieved.customer; const subscriptionCustomer = subscription.customer; const lineItems = retrieved.line_items; const subscriptionItems = subscription.items; const line = lineItems?.data[0]; const subscriptionItem = subscriptionItems.data[0]; const linePrice = line?.price; const lineProduct = linePrice && typeof linePrice.product !== "string" ? linePrice.product : null; const subscriptionPrice = subscriptionItem?.price; const subscriptionProduct = subscriptionPrice && typeof subscriptionPrice.product !== "string" ? subscriptionPrice.product : null;
      const validPriceProduct = (price: Stripe.Price | null | undefined, product: Stripe.Product | Stripe.DeletedProduct | null, expected: StripePriceAuthority) => price?.object === "price" && price.id === expected.priceId && price.active && price.recurring !== null && price.recurring !== undefined && !price.livemode && product?.object === "product" && product.deleted === undefined && product.id === expected.productId && product.active && !product.livemode;
      const retrievedSubscriptionId = typeof retrieved.subscription === "string" ? retrieved.subscription : retrieved.subscription?.id;
      if (session.object !== "checkout.session" || retrieved.object !== "checkout.session" || subscription.object !== "subscription" || session.livemode || retrieved.livemode || subscription.livemode || !/^cs_test_[A-Za-z0-9]+$/.test(session.id) || retrieved.id !== session.id || session.customer !== input.customerId || retrievedSubscriptionId !== subscriptionId || !customer || typeof customer === "string" || customer.object !== "customer" || customer.deleted !== undefined || customer.id !== input.customerId || customer.livemode || !exactMetadata(customer.metadata, { agentkip_schema: "1", clerk_subject: input.subject }) || !subscriptionCustomer || typeof subscriptionCustomer === "string" || subscriptionCustomer.object !== "customer" || subscriptionCustomer.deleted !== undefined || subscriptionCustomer.id !== input.customerId || subscriptionCustomer.livemode || !exactMetadata(subscriptionCustomer.metadata, { agentkip_schema: "1", clerk_subject: input.subject }) || session.mode !== "subscription" || retrieved.mode !== "subscription" || !validEpoch(session.created) || !validEpoch(session.expires_at) || !validEpoch(retrieved.created) || !validEpoch(retrieved.expires_at) || session.created !== retrieved.created || session.expires_at !== retrieved.expires_at || session.expires_at - session.created !== 86_400 || !exactMetadata(session.metadata, requestMetadata) || !exactMetadata(retrieved.metadata, requestMetadata) || !canonicalHostedUrl(session.url) || !canonicalHostedUrl(retrieved.url) || retrieved.url !== session.url || subscription.id !== subscriptionId || !exactMetadata(subscription.metadata, requestMetadata) || lineItems?.object !== "list" || lineItems.has_more || lineItems.data.length !== 1 || line?.object !== "item" || line.quantity !== 1 || !validPriceProduct(linePrice, lineProduct, input.authority) || subscriptionItems.object !== "list" || subscriptionItems.has_more || subscriptionItems.data.length !== 1 || subscriptionItem?.object !== "subscription_item" || subscriptionItem.subscription !== subscriptionId || subscriptionItem.quantity !== 1 || !validPriceProduct(subscriptionPrice, subscriptionProduct, input.authority)) throw new Error("checkout unavailable");
      return { sessionId: session.id, subscriptionId, customerId: input.customerId, priceId: input.authority.priceId, productId: input.authority.productId, checkoutUrl: session.url, createdAt: new Date(session.created * 1000), expiresAt: new Date(session.expires_at * 1000), livemode: false, mode: "subscription", quantity: 1, metadata: requestMetadata, subscriptionMetadata: requestMetadata };
    },
  };
}

class ProviderReadFailure extends Error {}
const blankReference = (): StripeAuthorityReference => ({ sessionId: "", customerId: null, subscriptionId: null });
const asRecord = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const canonicalId = (value: unknown, prefix: string): string | null => typeof value === "string" && new RegExp(`^${prefix}[A-Za-z0-9]+$`).test(value) ? value : null;
const linkedId = (value: unknown, prefix: string): string | null => typeof value === "string" ? canonicalId(value, prefix) : canonicalId(asRecord(value)?.id, prefix);
const expandedCustomerId = (value: unknown): string | null => {
  const customer = asRecord(value);
  const customerMetadata = asRecord(customer?.metadata);
  return customer && customer.object === "customer" && customer.livemode === false && customer.deleted === undefined && customerMetadata !== null && Reflect.ownKeys(customerMetadata).every((key) => typeof key === "string" && typeof customerMetadata[key] === "string") ? canonicalId(customer.id, "cus_") : null;
};
const expandedSubscriptionId = (value: unknown): string | null => {
  const subscription = asRecord(value);
  return subscription && subscription.object === "subscription" && subscription.livemode === false ? canonicalId(subscription.id, "sub_") : null;
};
const exact = (value: Record<string, unknown> | null, expected: Record<string, string>) => value !== null && Reflect.ownKeys(value).length === Object.keys(expected).length && Object.entries(expected).every(([key, item]) => Object.hasOwn(value, key) && value[key] === item);
const bundleFailure = (failureCode: NonNullable<StripeAuthorityBundle["failureCode"]>, reference = blankReference()): StripeAuthorityBundle => ({ valid: false, failureCode, reference });

export function createStripeWebhookGateway(config: W1WebhookConfig): StripeWebhookPort {
  const stripe = createClient(config.stripeSecretKey);
  const api = stripe as unknown as { checkout: { sessions: { retrieve(id: string, options: { expand: string[] }): Promise<unknown>; list(options: { subscription: string; limit: number }): Promise<unknown>; } }; subscriptions: { retrieve(id: string, options: { expand: string[] }): Promise<unknown> }; invoices: { retrieve(id: string, options: { expand: string[] }): Promise<unknown> }; customers: { retrieve(id: string): Promise<unknown> } };
  const read = async <T>(operation: () => Promise<T>): Promise<T> => { try { return await operation(); } catch { throw new ProviderReadFailure(); } };
  return {
    verifyWebhook(rawText, signature) { const event = stripe.webhooks.constructEvent(rawText, signature, config.stripeWebhookSecret); if (!event.id.startsWith("evt_") || !Number.isFinite(event.created)) throw new Error("invalid event"); return { id: event.id, type: event.type, createdAt: new Date(event.created * 1000), livemode: event.livemode, object: Object.fromEntries(Object.entries(event.data.object)) }; },
    async loadAuthorityBundle(envelope) {
      if (!classifySupportedEvent(envelope.type)) return bundleFailure("malformed_supported_object");
      if (envelope.livemode) return bundleFailure("wrong_mode");
      try {
        const signed = asRecord(envelope.object); if (!signed) return bundleFailure("malformed_supported_object");
        let session: Record<string, unknown> | null; let subscription: Record<string, unknown> | null; let invoice: Record<string, unknown> | null = null; let signedSessionId: string | null = null; let signedSubscriptionId: string | null = null; let parentSubscriptionId: string | null = null;
        if (envelope.type === "checkout.session.completed") {
          signedSessionId = canonicalId(signed.id, "cs_test_"); if (signed.object !== "checkout.session" || !signedSessionId) return bundleFailure("malformed_supported_object");
          session = asRecord(await read(() => api.checkout.sessions.retrieve(signedSessionId!, { expand: ["customer", "subscription", "line_items.data.price.product"] })));
          const subscriptionId = expandedSubscriptionId(session?.subscription); if (!subscriptionId) return bundleFailure("malformed_supported_object");
          subscription = asRecord(await read(() => api.subscriptions.retrieve(subscriptionId, { expand: ["customer", "items.data.price.product"] })));
        } else if (envelope.type.startsWith("customer.subscription.")) {
          signedSubscriptionId = canonicalId(signed.id, "sub_"); if (signed.object !== "subscription" || !signedSubscriptionId) return bundleFailure("malformed_supported_object");
          subscription = asRecord(await read(() => api.subscriptions.retrieve(signedSubscriptionId!, { expand: ["customer", "items.data.price.product"] })));
          const listed = asRecord(await read(() => api.checkout.sessions.list({ subscription: signedSubscriptionId!, limit: 2 }))); const data = Array.isArray(listed?.data) ? listed.data : null;
          if (!listed || listed.object !== "list" || listed.has_more !== false || !data || data.length !== 1) return bundleFailure("malformed_supported_object"); session = asRecord(data[0]);
        } else {
          const invoiceId = canonicalId(signed.id, "in_"); if (signed.object !== "invoice" || !invoiceId) return bundleFailure("malformed_supported_object");
          invoice = asRecord(await read(() => api.invoices.retrieve(invoiceId, { expand: ["customer", "parent.subscription_details.subscription", "lines.data.price.product"] })));
          const parent = asRecord(invoice?.parent); const details = asRecord(parent?.subscription_details); const subscriptionId = expandedSubscriptionId(details?.subscription); parentSubscriptionId = subscriptionId;
          if (!invoice || invoice.object !== "invoice" || invoice.livemode !== false || parent?.type !== "subscription_details" || !details || !subscriptionId) return bundleFailure("malformed_supported_object");
          if (invoice.id !== invoiceId) return bundleFailure("identifier_mismatch");
          if ((envelope.type === "invoice.paid" && invoice.paid !== true) || (envelope.type === "invoice.payment_failed" && invoice.paid !== false)) return bundleFailure("malformed_supported_object");
          subscription = asRecord(await read(() => api.subscriptions.retrieve(subscriptionId, { expand: ["customer", "items.data.price.product"] })));
          const listed = asRecord(await read(() => api.checkout.sessions.list({ subscription: subscriptionId, limit: 2 }))); const data = Array.isArray(listed?.data) ? listed.data : null;
          if (!listed || listed.object !== "list" || listed.has_more !== false || !data || data.length !== 1) return bundleFailure("malformed_supported_object"); session = asRecord(data[0]);
        }
        const sessionId = canonicalId(session?.id, "cs_test_"); const subscriptionId = canonicalId(subscription?.id, "sub_"); const customerId = expandedCustomerId(session?.customer); const subscriptionCustomerId = expandedCustomerId(subscription?.customer); const invoiceCustomerId = invoice ? expandedCustomerId(invoice.customer) : null; const reference = { sessionId: sessionId ?? "", subscriptionId, customerId };
        if (!sessionId || !subscriptionId || !customerId || !subscriptionCustomerId || (invoice && !invoiceCustomerId) || session?.object !== "checkout.session" || session.livemode !== false || session.mode !== "subscription" || subscription?.object !== "subscription" || subscription.livemode !== false) return bundleFailure("malformed_supported_object", reference);
        if ((signedSessionId && sessionId !== signedSessionId) || (signedSubscriptionId && subscriptionId !== signedSubscriptionId) || (parentSubscriptionId && subscriptionId !== parentSubscriptionId) || linkedId(session.subscription, "sub_") !== subscriptionId || subscriptionCustomerId !== customerId || (invoice && invoiceCustomerId !== customerId)) return bundleFailure("identifier_mismatch", reference);
        const customer = asRecord(await read(() => api.customers.retrieve(customerId))); const customerMetadata = asRecord(customer?.metadata); const sessionMetadata = asRecord(session.metadata); const subscriptionMetadata = asRecord(subscription.metadata); const clerkSubject = typeof customerMetadata?.clerk_subject === "string" ? customerMetadata.clerk_subject : null; const checkoutRequestId = typeof sessionMetadata?.checkout_request_id === "string" ? sessionMetadata.checkout_request_id : null;
        if (!customer || customer.deleted === true) return bundleFailure("unknown_customer", reference);
        if (customer.id !== customerId) return bundleFailure("identifier_mismatch", reference);
        if (customer.object !== "customer" || customer.livemode !== false || customer.deleted !== undefined) return bundleFailure("malformed_supported_object", reference);
        if (!clerkSubject || !checkoutRequestId || !exact(customerMetadata, { agentkip_schema: "1", clerk_subject: clerkSubject }) || !exact(sessionMetadata, { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: clerkSubject, checkout_request_id: checkoutRequestId }) || !exact(subscriptionMetadata, { agentkip_schema: "1", agentkip_product: "agentkip_first_friend", clerk_subject: clerkSubject, checkout_request_id: checkoutRequestId })) return bundleFailure("metadata_mismatch", reference);
        const items = asRecord(subscription.items); const data = Array.isArray(items?.data) ? items.data : null; const item = data && data.length === 1 ? asRecord(data[0]) : null; const price = asRecord(item?.price); const product = asRecord(price?.product);
        if (!items || items.object !== "list" || items.has_more !== false || !data || data.length !== 1 || !item || item.object !== "subscription_item" || item.quantity !== 1 || linkedId(item.subscription, "sub_") !== subscriptionId || !price || price.object !== "price" || price.livemode !== false || !asRecord(price.recurring) || !product || product.object !== "product" || product.livemode !== false || product.deleted !== undefined) return bundleFailure("malformed_supported_object", reference);
        const priceId = canonicalId(price.id, "price_"); const productId = canonicalId(product.id, "prod_"); if (!priceId || !productId) return bundleFailure("malformed_supported_object", reference); if (priceId !== config.priceId) return bundleFailure("price_mismatch", reference); if (productId !== config.productId) return bundleFailure("product_mismatch", reference);
        return { valid: true, reference, status: typeof subscription.status === "string" ? subscription.status : undefined, clerkSubject, checkoutRequestId, priceId, productId };
      } catch (error) { if (error instanceof ProviderReadFailure) throw new Error("stripe read failed"); return bundleFailure("malformed_supported_object"); }
    },
  };
}
