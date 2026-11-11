import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { ensureDatabase } from "./support.mjs";

/* FR-6, FR-8, FR-9. End-to-end order creation and the PayMongo webhook against a
   real database: real Postgres rows, real GoTrue tokens, real PostgREST queries,
   real Express routes and a real HMAC signature. Only PayMongo's HTTP API is
   stubbed, because no sandbox key is available to the test.

   Run with `npm test` from backend/. */

const WEBHOOK_SECRET = "whsec_local_phase3";
const PAYMONGO_KEY = "sk_test_phase3";
const PASSWORD = "Phase3-test-pass";

const database = ensureDatabase();
process.env.SUPABASE_URL = database.url;
process.env.SUPABASE_SERVICE_ROLE_KEY = database.serviceKey;
process.env.PAYMONGO_SECRET_KEY = PAYMONGO_KEY;
process.env.PAYMONGO_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.PORT = "0";
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

const stamp = Date.now();
const realFetch = globalThis.fetch;
const intentCalls = [];
let intentSequence = 0;
// Per-run intents: a leftover row from an interrupted run can never collide.
const intentPrefix = `pi_test_${stamp}_`;

// The only external dependency, replaced with a canned intent.
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;

  if (url.startsWith("https://api.paymongo.com")) {
    intentCalls.push({ url, headers: init?.headers ?? {}, body: JSON.parse(init?.body ?? "{}") });
    const id = `${intentPrefix}${++intentSequence}`;
    return new Response(
      JSON.stringify({
        data: { id, attributes: { client_key: `${id}_client`, status: "awaiting_payment_method" } },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  return realFetch(input, init);
};

const { supabase } = await import("../src/lib/supabase.js");
const { computeDeliveryFee } = await import("../src/lib/fee.js");
const { server, io } = await import("../src/index.js");

if (!server.listening) await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const admin = supabase();

const created = { users: [], products: [], addresses: [], orders: [] };
// Declared out here so teardown can restore it whatever happens inside the try.
let realEmit = null;

const api = async (route, { method = "GET", token, body, raw, headers = {} } = {}) => {
  const response = await realFetch(`${base}${route}`, {
    method,
    headers: {
      ...(body || raw ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { status: response.status, json, text };
};

const sign = (raw) => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const digest = createHmac("sha256", WEBHOOK_SECRET).update(`${timestamp}.${raw}`).digest("hex");
  return `t=${timestamp},te=${digest}`;
};

let failures = 0;
async function ok(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${name} -> ${error.message}`);
  }
}

async function sweepLeftovers() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });

  for (const user of data?.users ?? []) {
    if (user.email?.startsWith("phase3+")) await admin.auth.admin.deleteUser(user.id);
  }

  await admin.from("products").delete().like("name", "Phase 3 %");
}

async function createAccount(label, role = "customer") {
  const email = `phase3+${label}+${stamp}@agrimart.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Phase 3 ${label}` },
  });

  assert.equal(error, null, `create ${label}: ${error?.message}`);
  created.users.push(data.user.id);

  if (role !== "customer") {
    const { error: roleError } = await admin.from("profiles").update({ role }).eq("id", data.user.id);
    assert.equal(roleError, null, `promote ${label}: ${roleError?.message}`);
  }

  const response = await realFetch(`${database.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: database.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const session = await response.json();
  assert.equal(response.status, 200, `sign in ${label}: ${JSON.stringify(session)}`);

  return { id: data.user.id, email, token: session.access_token };
}

try {
  console.log("--- setup");
  await sweepLeftovers();

  const customer = await createAccount("buyer");
  const token = customer.token;
  const staff = await createAccount("staff", "staff");

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", customer.id)
    .single();
  await ok("the new-user trigger created a customer profile", () =>
    assert.deepEqual({ role: profile.role, name: profile.full_name }, { role: "customer", name: "Phase 3 buyer" }),
  );

  const { data: product, error: productError } = await admin
    .from("products")
    .insert({ name: `Phase 3 rice ${stamp}`, price: 100, stock_qty: 10, reorder_level: 3, unit: "kg" })
    .select("*")
    .single();
  assert.equal(productError, null, `create product: ${productError?.message}`);
  created.products.push(product.id);

  const { data: scarce } = await admin
    .from("products")
    .insert({ name: `Phase 3 scarce ${stamp}`, price: 50, stock_qty: 1, reorder_level: 0, unit: "kg" })
    .select("*")
    .single();
  created.products.push(scarce.id);

  const { data: address, error: addressError } = await admin
    .from("addresses")
    .insert({
      user_id: customer.id,
      street: "1 Test Street",
      barangay: "Poblacion",
      municipality: "Quezon City",
      province: "Metro Manila",
      latitude: 14.676,
      longitude: 121.0437,
      is_default: true,
    })
    .select("*")
    .single();
  assert.equal(addressError, null, `create address: ${addressError?.message}`);
  created.addresses.push(address.id);

  const expectedFee = computeDeliveryFee({
    store: { latitude: 14.5995, longitude: 120.9842 },
    destination: { latitude: address.latitude, longitude: address.longitude },
    rates: { base_fee: 50, per_km: 10 },
  });

  console.log("--- order creation");

  const orderResponse = await api("/api/orders", {
    method: "POST",
    token,
    body: {
      items: [{ product_id: product.id, qty: 2 }],
      fulfillment_type: "delivery",
      address_id: address.id,
      method: "gcash",
    },
  });

  assert.equal(orderResponse.status, 201, `create order: ${orderResponse.text}`);
  const { order, payment } = orderResponse.json;
  created.orders.push(order.id);

  await ok("prices and the delivery fee come from the server", () => {
    assert.equal(Number(order.delivery_fee), expectedFee);
    assert.equal(Number(order.total_amount), Number((200 + expectedFee).toFixed(2)));
    assert.equal(order.status, "pending");
    assert.equal(order.fulfillment_type, "delivery");
    assert.equal(order.order_items.length, 1);
    assert.equal(Number(order.order_items[0].subtotal), 200);
  });

  await ok("the response carries the intent the browser needs", () => {
    assert.equal(payment.intent_id, `${intentPrefix}1`);
    assert.equal(payment.client_key, `${intentPrefix}1_client`);
  });

  await ok("the intent was created for the full total in centavos", () => {
    assert.equal(intentCalls.length, 1);
    const [{ url, headers, body }] = intentCalls;
    assert.equal(url, "https://api.paymongo.com/v1/payment_intents");
    assert.deepEqual(body.data.attributes.payment_method_allowed, ["gcash"]);
    assert.equal(body.data.attributes.capture_type, "automatic");
    assert.equal(body.data.attributes.currency, "PHP");
    assert.equal(body.data.attributes.amount, Math.round(Number(order.total_amount) * 100));
    assert.equal(headers.Authorization, `Basic ${Buffer.from(`${PAYMONGO_KEY}:`).toString("base64")}`);
  });

  const storedPayment = await admin
    .from("payments")
    .select("method, status, amount, paymongo_ref")
    .eq("order_id", order.id)
    .single();

  await ok("a pending payment row points at the intent", () => {
    assert.equal(storedPayment.error, null, storedPayment.error?.message);
    assert.deepEqual(
      {
        method: storedPayment.data.method,
        status: storedPayment.data.status,
        ref: storedPayment.data.paymongo_ref,
      },
      { method: "gcash", status: "pending", ref: `${intentPrefix}1` },
    );
    assert.equal(Number(storedPayment.data.amount), Number(order.total_amount));
  });

  const detail = await api(`/api/orders/${order.id}`, { token });
  await ok("GET /orders/:id returns the items the tracker needs", () => {
    assert.equal(detail.status, 200, detail.text);
    assert.equal(detail.json.data.id, order.id);
    assert.equal(detail.json.data.order_items[0].quantity, 2);
    assert.match(detail.json.data.order_items[0].products.name, /Phase 3 rice/);
    const paymentRow = Array.isArray(detail.json.data.payments)
      ? detail.json.data.payments[0]
      : detail.json.data.payments;
    assert.equal(paymentRow.status, "pending");
  });

  const stranger = await api(`/api/orders/${order.id}`);
  await ok("the order is not readable without a token", () => assert.equal(stranger.status, 401));

  const other = await createAccount("other");
  const foreign = await api(`/api/orders/${order.id}`, { token: other.token });
  await ok("another account's order answers 404, not 403", () => assert.equal(foreign.status, 404));

  console.log("--- webhook");

  const emitted = [];
  realEmit = io.emit.bind(io);
  io.emit = (event, payload) => {
    emitted.push({ event, payload });
    return realEmit(event, payload);
  };

  const event = {
    data: {
      attributes: {
        type: "payment.paid",
        livemode: false,
        data: {
          id: "pay_test_1",
          type: "payment",
          attributes: {
            payment_intent_id: payment.intent_id,
            status: "paid",
            amount: Math.round(Number(order.total_amount) * 100),
          },
        },
      },
    },
  };
  const rawEvent = JSON.stringify(event);

  const webhook = await api("/api/payments/webhook", {
    method: "POST",
    raw: rawEvent,
    headers: { "Paymongo-Signature": sign(rawEvent) },
  });

  await ok("a signed payment.paid is accepted", () => {
    assert.equal(webhook.status, 200, webhook.text);
    assert.equal(webhook.json.status, "paid");
  });

  const paidOrder = await admin
    .from("orders")
    .select("status, stock_deducted")
    .eq("id", order.id)
    .single();
  const paidPayment = await admin
    .from("payments")
    .select("status, paid_at")
    .eq("order_id", order.id)
    .single();
  const remaining = await admin.from("products").select("stock_qty").eq("id", product.id).single();
  const logs = await admin
    .from("inventory_logs")
    .select("change_qty, reason")
    .eq("product_id", product.id);

  await ok("the order and payment become paid with a timestamp", () => {
    assert.equal(paidOrder.data.status, "paid");
    assert.equal(paidOrder.data.stock_deducted, true);
    assert.equal(paidPayment.data.status, "paid");
    assert.ok(paidPayment.data.paid_at, "paid_at is empty");
  });

  await ok("stock dropped by the ordered quantity", () => {
    assert.equal(remaining.data.stock_qty, 8);
    assert.deepEqual(logs.data, [{ change_qty: -2, reason: "sale" }]);
  });

  await ok("the new quantity was broadcast on the stock socket", () => {
    const stock = emitted.find((entry) => entry.event === "stock" && entry.payload.product_id === product.id);
    assert.ok(stock, `no stock event in ${JSON.stringify(emitted)}`);
    assert.equal(stock.payload.stock_qty, 8);
  });

  const duplicate = await api("/api/payments/webhook", {
    method: "POST",
    raw: rawEvent,
    headers: { "Paymongo-Signature": sign(rawEvent) },
  });

  const afterDuplicate = await admin.from("products").select("stock_qty").eq("id", product.id).single();

  await ok("a repeated delivery is acknowledged without deducting twice", () => {
    assert.equal(duplicate.status, 200, duplicate.text);
    assert.equal(duplicate.json.duplicate, true);
    assert.equal(afterDuplicate.data.stock_qty, 8);
  });

  const forged = await api("/api/payments/webhook", {
    method: "POST",
    raw: rawEvent,
    headers: { "Paymongo-Signature": "t=1,te=deadbeef" },
  });
  await ok("an unsigned or forged delivery is rejected", () => assert.equal(forged.status, 401));

  console.log("--- guard rails");

  const intentsBeforeOversell = intentCalls.length;
  const oversell = await api("/api/orders", {
    method: "POST",
    token,
    body: {
      items: [{ product_id: scarce.id, qty: 5 }],
      fulfillment_type: "pickup",
      method: "cod",
    },
  });

  await ok("a quantity above stock is refused with a field path", () => {
    assert.equal(oversell.status, 400, oversell.text);
    assert.equal(oversell.json.details[0].path, "items.0.qty");
    assert.match(oversell.json.details[0].message, /Only 1/);
  });

  await ok("a refused order never reaches PayMongo", () => assert.equal(intentCalls.length, intentsBeforeOversell));

  const pickup = await api("/api/orders", {
    method: "POST",
    token,
    body: {
      items: [{ product_id: product.id, qty: 1 }],
      fulfillment_type: "pickup",
      method: "cod",
    },
  });

  if (pickup.status === 201) created.orders.push(pickup.json.order.id);

  await ok("pickup is free and stores no address", () => {
    assert.equal(pickup.status, 201, pickup.text);
    assert.equal(Number(pickup.json.order.delivery_fee), 0);
    assert.equal(pickup.json.order.address_id, null);
    assert.equal(pickup.json.payment, null);
  });

  const anonymousCancel = await api(`/api/orders/${pickup.json.order.id}/cancel`, {
    method: "POST",
    body: {},
  });
  await ok("cancel needs a token too", () => assert.equal(anonymousCancel.status, 401));

  const cancelled = await api(`/api/orders/${pickup.json.order.id}/cancel`, {
    method: "POST",
    token,
    body: {},
  });
  const closedPayment = await admin
    .from("payments")
    .select("status")
    .eq("order_id", pickup.json.order.id)
    .single();

  await ok("a pending order cancels and closes its payment", () => {
    assert.equal(cancelled.status, 200, cancelled.text);
    assert.equal(cancelled.json.data.status, "cancelled");
    assert.equal(closedPayment.data.status, "failed");
  });
  console.log("--- COD and status transitions");

  const intentsBeforeCod = intentCalls.length;
  const { data: codProduct } = await admin
    .from("products")
    .insert({ name: `Phase 3 cod ${stamp}`, price: 80, stock_qty: 5, reorder_level: 4, unit: "kg" })
    .select("*")
    .single();
  created.products.push(codProduct.id);

  const codResponse = await api("/api/orders", {
    method: "POST",
    token,
    body: {
      items: [{ product_id: codProduct.id, qty: 2 }],
      fulfillment_type: "pickup",
      method: "cod",
    },
  });
  assert.equal(codResponse.status, 201, `cod order: ${codResponse.text}`);
  const codOrder = codResponse.json.order;
  created.orders.push(codOrder.id);

  await ok("a COD order starts pending with no intent", () => {
    assert.equal(codOrder.status, "pending");
    assert.equal(codResponse.json.payment, null);
    assert.equal(intentCalls.length, intentsBeforeCod);
  });

  const customerStatus = await api(`/api/orders/${codOrder.id}/status`, {
    method: "PATCH",
    token,
    body: { status: "preparing" },
  });
  await ok("customers cannot change a status", () => assert.equal(customerStatus.status, 403));

  const preparing = await api(`/api/orders/${codOrder.id}/status`, {
    method: "PATCH",
    token: staff.token,
    body: { status: "preparing" },
  });
  const stockAfterPreparing = await admin
    .from("products")
    .select("stock_qty")
    .eq("id", codProduct.id)
    .single();
  const codPayment = await admin
    .from("payments")
    .select("status")
    .eq("order_id", codOrder.id)
    .single();

  await ok("COD deducts stock at preparing but stays unpaid", () => {
    assert.equal(preparing.status, 200, preparing.text);
    assert.equal(preparing.json.data.status, "preparing");
    assert.equal(stockAfterPreparing.data.stock_qty, 3);
    assert.equal(codPayment.data.status, "pending");
  });

  await ok("the COD deduction is broadcast on the stock socket", () => {
    const event = emitted.find(
      (entry) => entry.event === "stock" && entry.payload.product_id === codProduct.id,
    );
    assert.ok(event, `no stock event in ${JSON.stringify(emitted)}`);
    assert.equal(event.payload.stock_qty, 3);
  });

  const pickupDelivery = await api(`/api/orders/${codOrder.id}/status`, {
    method: "PATCH",
    token: staff.token,
    body: { status: "out_for_delivery" },
  });
  await ok("pickup orders refuse out_for_delivery", () => assert.equal(pickupDelivery.status, 400));

  const completed = await api(`/api/orders/${codOrder.id}/status`, {
    method: "PATCH",
    token: staff.token,
    body: { status: "completed" },
  });
  const paidCod = await admin
    .from("payments")
    .select("status, paid_at")
    .eq("order_id", codOrder.id)
    .single();

  await ok("COD is marked paid when it completes", () => {
    assert.equal(completed.status, 200, completed.text);
    assert.equal(completed.json.data.status, "completed");
    assert.equal(paidCod.data.status, "paid");
    assert.ok(paidCod.data.paid_at, "paid_at is empty");
  });

  const backwards = await api(`/api/orders/${codOrder.id}/status`, {
    method: "PATCH",
    token: staff.token,
    body: { status: "preparing" },
  });
  await ok("a completed order cannot move backwards", () => assert.equal(backwards.status, 409));

  const staffList = await api("/api/orders?limit=50", { token: staff.token });
  const customerList = await api("/api/orders?limit=50", { token });
  await ok("staff see every order, customers only their own", () => {
    assert.equal(staffList.status, 200, staffList.text);
    assert.ok(staffList.json.data.some((entry) => entry.user_id === customer.id));
    assert.ok(customerList.json.data.every((entry) => entry.user_id === customer.id));
  });
} catch (error) {
  failures += 1;
  console.error(`\nFAIL ${error.message}\n${error.stack ?? ""}`);
} finally {
  globalThis.fetch = realFetch;
  if (realEmit) io.emit = realEmit;

  try {
    if (created.orders.length) await admin.from("orders").delete().in("id", created.orders);
    if (created.products.length) await admin.from("products").delete().in("id", created.products);
    if (created.addresses.length) await admin.from("addresses").delete().in("id", created.addresses);
    for (const id of created.users) await admin.auth.admin.deleteUser(id);
  } catch (error) {
    console.error(`[cleanup] ${error.message}`);
  }

  io.close();
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
}

console.log(`\n${failures === 0 ? "all checks passed" : `${failures} check(s) failed`}`);
process.exitCode = failures === 0 ? 0 : 1;
