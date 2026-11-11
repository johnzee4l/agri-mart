import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { generateVAPIDKeys } from "web-push";

import { ensureDatabase } from "./support.mjs";

/* FR-21, blueprint 6.2. The four push events, against a real database and the real
   routes: order status to the customer, a new order and a paid order to staff and
   admins, a published announcement to subscribed customers, and low stock to admins.

   A local run cannot reach a push service, so `setPushTransport` replaces the network
   send with a recorder. Everything else is real: subscriptions are stored through
   POST /push/subscribe, recipients are resolved from profiles and push_subscriptions
   by lib/push.js, and the webhook signature is real.

   Run with `npm test` from backend/. */

const WEBHOOK_SECRET = "whsec_local_phase5";
const PAYMONGO_KEY = "sk_test_phase5";
const PASSWORD = "Phase5-test-pass";

const database = ensureDatabase();
process.env.SUPABASE_URL = database.url;
process.env.SUPABASE_SERVICE_ROLE_KEY = database.serviceKey;
process.env.PAYMONGO_SECRET_KEY = PAYMONGO_KEY;
process.env.PAYMONGO_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.PORT = "0";
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

// Real keys, so pushConfigured() is true and the payloads are actually built.
const vapid = generateVAPIDKeys();
process.env.VAPID_PUBLIC_KEY = vapid.publicKey;
process.env.VAPID_PRIVATE_KEY = vapid.privateKey;
process.env.VAPID_SUBJECT = "mailto:phase5@agrimart.test";

const stamp = Date.now();
const realFetch = globalThis.fetch;
let intentSequence = 0;

// PayMongo is the only external dependency; it answers with a canned intent.
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;

  if (url.startsWith("https://api.paymongo.com")) {
    const id = `pi_test_${stamp}_${++intentSequence}`;
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
const { setPushTransport } = await import("../src/lib/push.js");
const { server, io } = await import("../src/index.js");

if (!server.listening) await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const admin = supabase();

/** Every push the server tried to deliver, in order. */
const sent = [];
setPushTransport(async (subscription, body) => {
  sent.push({ endpoint: subscription.endpoint, payload: JSON.parse(body) });
});

const endpoints = {
  customer: `https://push.test/customer-${stamp}`,
  staff: `https://push.test/staff-${stamp}`,
  admin: `https://push.test/admin-${stamp}`,
};

const created = { users: [], products: [], orders: [], announcements: [] };

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** What reached one account's browser. */
const sentTo = (label) => sent.filter((record) => record.endpoint === endpoints[label]);

/** Sends are fire and forget, so poll for the notification instead of assuming it. */
async function waitForPush(label, predicate, timeoutMs = 5000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const match = sentTo(label).find(predicate);
    if (match) return match;
    await sleep(50);
  }

  return null;
}

function seen() {
  return JSON.stringify(sent.map((record) => `${record.endpoint} ${record.payload.title}`));
}

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
    if (user.email?.startsWith("phase5+")) await admin.auth.admin.deleteUser(user.id);
  }

  await admin.from("products").delete().like("name", "Phase 5 %");
}

async function createAccount(label, role = "customer") {
  const email = `phase5+${label}+${stamp}@agrimart.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Phase 5 ${label}` },
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

async function createProduct(name, { stock, reorder, price = 25 } = {}) {
  const { data, error } = await admin
    .from("products")
    .insert({
      name: `Phase 5 ${name} ${stamp}`,
      price,
      stock_qty: stock,
      reorder_level: reorder,
      unit: "kg",
    })
    .select("*")
    .single();

  assert.equal(error, null, `create product ${name}: ${error?.message}`);
  created.products.push(data.id);
  return data;
}

async function subscribe(label, token) {
  const response = await api("/api/push/subscribe", {
    method: "POST",
    token,
    body: { endpoint: endpoints[label], keys: { p256dh: `p256dh-${label}`, auth: `auth-${label}` } },
  });

  assert.equal(response.status, 201, `subscribe ${label}: ${response.text}`);
}

try {
  console.log("--- setup");
  await sweepLeftovers();

  const staff = await createAccount("staff", "staff");
  const owner = await createAccount("admin", "admin");
  const customer = await createAccount("buyer");

  await subscribe("customer", customer.token);
  await subscribe("staff", staff.token);
  await subscribe("admin", owner.token);

  const widget = await createProduct("widget", { stock: 50, reorder: 0, price: 50 });

  console.log("--- new order");

  const cod = await api("/api/orders", {
    method: "POST",
    token: customer.token,
    body: {
      items: [{ product_id: widget.id, qty: 2 }],
      fulfillment_type: "pickup",
      method: "cod",
    },
  });

  assert.equal(cod.status, 201, `cod order: ${cod.text}`);
  const codId = cod.json.order.id;
  created.orders.push(codId);

  await ok("a new order pushes to staff and admins, not to the buyer", async () => {
    const onStaff = await waitForPush("staff", (record) => record.payload.tag === `staff-order-${codId}`);
    const onAdmin = await waitForPush("admin", (record) => record.payload.tag === `staff-order-${codId}`);

    assert.ok(onStaff, `no new-order push for staff: ${seen()}`);
    assert.ok(onAdmin, `no new-order push for an admin: ${seen()}`);
    assert.equal(onStaff.payload.title, "New order");
    assert.equal(onStaff.payload.url, "/admin/orders");
    assert.match(onStaff.payload.body, /2 items/);
    assert.match(onStaff.payload.body, /cash on delivery/);
    assert.equal(
      sentTo("customer").some((record) => record.payload.title === "New order"),
      false,
    );
  });

  console.log("--- order status changed");

  const preparing = await api(`/api/orders/${codId}/status`, {
    method: "PATCH",
    token: staff.token,
    body: { status: "preparing" },
  });

  await ok("an order status change pushes to that customer only", async () => {
    assert.equal(preparing.status, 200, preparing.text);

    const push = await waitForPush("customer", (record) => record.payload.tag === `order-${codId}`);
    assert.ok(push, `no status push for the customer: ${seen()}`);
    assert.equal(push.payload.url, `/orders/${codId}`);
    assert.match(push.payload.body, /being prepared/);
    assert.equal(sentTo("staff").some((record) => record.payload.tag === `order-${codId}`), false);
    assert.equal(sentTo("admin").some((record) => record.payload.tag === `order-${codId}`), false);
  });

  console.log("--- order paid");

  const online = await api("/api/orders", {
    method: "POST",
    token: customer.token,
    body: {
      items: [{ product_id: widget.id, qty: 1 }],
      fulfillment_type: "pickup",
      method: "gcash",
    },
  });

  assert.equal(online.status, 201, `gcash order: ${online.text}`);
  const onlineId = online.json.order.id;
  created.orders.push(onlineId);

  const webhookBody = JSON.stringify({
    data: {
      attributes: {
        type: "payment.paid",
        data: {
          type: "payment",
          attributes: { payment_intent_id: online.json.payment.intent_id, status: "paid" },
        },
      },
    },
  });

  const webhook = await api("/api/payments/webhook", {
    method: "POST",
    raw: webhookBody,
    headers: { "Paymongo-Signature": sign(webhookBody) },
  });

  await ok("a paid order pushes to staff and admins", async () => {
    assert.equal(webhook.status, 200, webhook.text);

    const paid = (record) => record.payload.title === "Order paid" && record.payload.tag === `staff-order-${onlineId}`;
    const onStaff = await waitForPush("staff", paid);
    const onAdmin = await waitForPush("admin", paid);

    assert.ok(onStaff, `no payment push for staff: ${seen()}`);
    assert.ok(onAdmin, `no payment push for an admin: ${seen()}`);
    assert.equal(onStaff.payload.url, "/admin/orders");
    assert.match(onStaff.payload.body, /paid by GCash/);
    assert.equal(
      sentTo("customer").some((record) => record.payload.title === "Order paid"),
      false,
    );
  });

  console.log("--- low stock");

  const low = await createProduct("low item", { stock: 5, reorder: 4, price: 30 });

  const spoilage = await api("/api/inventory/adjust", {
    method: "POST",
    token: staff.token,
    body: { product_id: low.id, change_qty: -2, reason: "spoilage" },
  });

  await ok("low stock pushes to admins only", async () => {
    assert.equal(spoilage.status, 201, spoilage.text);
    assert.equal(spoilage.json.low_stock, true);

    const push = await waitForPush("admin", (record) => record.payload.title === "Low stock");
    assert.ok(push, `no low-stock push for an admin: ${seen()}`);
    assert.equal(push.payload.url, "/admin/inventory");
    assert.match(push.payload.body, /1 product at or below reorder level/);
    assert.match(push.payload.body, /Phase 5 low item/);
    assert.match(push.payload.body, /3\)/);
    assert.equal(sentTo("staff").some((record) => record.payload.title === "Low stock"), false);
    assert.equal(sentTo("customer").some((record) => record.payload.title === "Low stock"), false);
  });

  console.log("--- announcements");

  const published = await api("/api/announcements", {
    method: "POST",
    token: owner.token,
    body: {
      title: `Phase 5 harvest notice ${stamp}`,
      body: "Rice seed restock has arrived.\nFirst come, first served.",
      published_at: new Date().toISOString(),
    },
  });

  assert.equal(published.status, 201, `publish announcement: ${published.text}`);
  const publishedId = published.json.data.id;
  created.announcements.push(publishedId);

  await ok("publishing an announcement pushes to subscribed customers", async () => {
    const push = await waitForPush("customer", (record) => record.payload.tag === `announcement-${publishedId}`);

    assert.ok(push, `no announcement push for the customer: ${seen()}`);
    assert.equal(push.payload.title, `Phase 5 harvest notice ${stamp}`);
    assert.equal(push.payload.url, "/announcements");
    assert.match(push.payload.body, /^Rice seed restock has arrived\. First come, first served\.$/);
    assert.equal(
      sentTo("staff").some((record) => record.payload.tag === `announcement-${publishedId}`),
      false,
    );
  });

  const draft = await api("/api/announcements", {
    method: "POST",
    token: owner.token,
    body: { title: `Phase 5 draft notice ${stamp}`, body: "Not announced yet." },
  });

  assert.equal(draft.status, 201, `draft announcement: ${draft.text}`);
  const draftId = draft.json.data.id;
  const draftTag = `announcement-${draftId}`;
  created.announcements.push(draftId);

  await sleep(300);
  const afterDraft = sentTo("customer").filter((record) => record.payload.tag === draftTag).length;

  const publish = await api(`/api/announcements/${draftId}`, {
    method: "PATCH",
    token: owner.token,
    body: { published_at: new Date().toISOString() },
  });

  const pushed = await waitForPush("customer", (record) => record.payload.tag === draftTag);

  const retitle = await api(`/api/announcements/${draftId}`, {
    method: "PATCH",
    token: owner.token,
    body: { title: `Phase 5 draft notice ${stamp} (edited)` },
  });

  await sleep(300);

  await ok("a draft stays silent until it is published, and only pushes once", async () => {
    assert.equal(afterDraft, 0, "the draft push was sent before it was published");
    assert.equal(publish.status, 200, publish.text);
    assert.ok(pushed, `the published draft sent no push: ${seen()}`);
    assert.equal(pushed.payload.url, "/announcements");
    assert.equal(retitle.status, 200, retitle.text);
    assert.equal(
      sentTo("customer").filter((record) => record.payload.tag === draftTag).length,
      1,
      "editing a published announcement pushed a second time",
    );
  });
} catch (error) {
  failures += 1;
  console.error(`\nFAIL ${error.message}\n${error.stack ?? ""}`);
} finally {
  globalThis.fetch = realFetch;
  setPushTransport(null);

  try {
    if (created.orders.length) await admin.from("orders").delete().in("id", created.orders);
    if (created.products.length) await admin.from("products").delete().in("id", created.products);
    if (created.announcements.length) {
      await admin.from("announcements").delete().in("id", created.announcements);
    }

    for (const id of created.users) {
      await admin.from("push_subscriptions").delete().eq("user_id", id);
      await admin.from("inventory_logs").delete().eq("user_id", id);
      await admin.auth.admin.deleteUser(id);
    }
  } catch (error) {
    console.error(`[cleanup] ${error.message}`);
  }

  io.close();
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
}

console.log(`\n${failures === 0 ? "all checks passed" : `${failures} check(s) failed`}`);
process.exitCode = failures === 0 ? 0 : 1;
