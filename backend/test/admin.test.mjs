import assert from "node:assert/strict";
import { generateVAPIDKeys } from "web-push";

import { ensureDatabase } from "./support.mjs";

/* FR-16, FR-18, FR-21. Admin user management, the dashboard summary, the four
   reports with CSV output, and push subscription management, against a real
   database. Push sending itself is not exercised (it needs a real push service);
   subscription storage and the VAPID key handshake are.

   Run with `npm test` from backend/. */

const PASSWORD = "Admin-test-pass";
const database = ensureDatabase();
const vapid = generateVAPIDKeys();

process.env.SUPABASE_URL = database.url;
process.env.SUPABASE_SERVICE_ROLE_KEY = database.serviceKey;
process.env.PORT = "0";
process.env.VAPID_PUBLIC_KEY = vapid.publicKey;
process.env.VAPID_PRIVATE_KEY = vapid.privateKey;
process.env.VAPID_SUBJECT = "mailto:test@agrimart.test";

const realFetch = globalThis.fetch;
const { supabase } = await import("../src/lib/supabase.js");
const { sendPushToUser } = await import("../src/lib/push.js");
const { server, io } = await import("../src/index.js");

if (!server.listening) await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const admin = supabase();

const stamp = Date.now();
const created = { users: [], products: [], orders: [] };
const endpoint = `https://push.example.test/phase4/${stamp}`;

const api = async (route, { method = "GET", token, body } = {}) => {
  const response = await realFetch(`${base}${route}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { status: response.status, json, text, headers: response.headers };
};

async function createAccount(label, role = "customer") {
  const email = `phase4admin+${label}+${stamp}@agrimart.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Phase 4 ${label}` },
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

async function createProduct(name, { stock, reorder, price }) {
  const { data, error } = await admin
    .from("products")
    .insert({ name: `Phase 4 ${name} ${stamp}`, price, stock_qty: stock, reorder_level: reorder, unit: "kg" })
    .select("*")
    .single();

  assert.equal(error, null, `create product ${name}: ${error?.message}`);
  created.products.push(data.id);
  return data;
}

async function sweepLeftovers() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });

  for (const user of data?.users ?? []) {
    if (user.email?.startsWith("phase4admin+")) await admin.auth.admin.deleteUser(user.id);
  }

  await admin.from("products").delete().like("name", "Phase 4 %");
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

try {
  console.log("--- setup");
  await sweepLeftovers();

  const adminAccount = await createAccount("admin", "admin");
  const staff = await createAccount("staff", "staff");
  const customer = await createAccount("buyer");
  const promote = await createAccount("promote");

  const low = await createProduct("low", { stock: 1, reorder: 5, price: 40 });
  const sold = await createProduct("sold", { stock: 50, reorder: 5, price: 250 });

  const { data: paidOrder, error: orderError } = await admin
    .from("orders")
    .insert({
      user_id: customer.id,
      fulfillment_type: "pickup",
      delivery_fee: 0,
      total_amount: 500,
      status: "paid",
    })
    .select("*")
    .single();

  assert.equal(orderError, null, `paid order: ${orderError?.message}`);
  created.orders.push(paidOrder.id);

  const { error: itemError } = await admin.from("order_items").insert({
    order_id: paidOrder.id,
    product_id: sold.id,
    quantity: 2,
    unit_price: 250,
    subtotal: 500,
  });
  assert.equal(itemError, null, `order item: ${itemError?.message}`);

  console.log("--- users");

  const staffUsers = await api("/api/users", { token: staff.token });
  const customerUsers = await api("/api/users", { token: customer.token });
  await ok("only admins reach user management", () => {
    assert.equal(staffUsers.status, 403);
    assert.equal(customerUsers.status, 403);
  });

  const list = await api("/api/users?q=Phase%204&limit=50", { token: adminAccount.token });
  await ok("the admin list carries roles, state and email", () => {
    assert.equal(list.status, 200, list.text);
    assert.ok(list.json.total >= 4, `total ${list.json.total}`);
    const row = list.json.data.find((entry) => entry.id === customer.id);
    assert.ok(row, "the customer is missing");
    assert.equal(row.role, "customer");
    assert.equal(row.is_active, true);
    assert.equal(row.email, customer.email);
  });

  const promoted = await api(`/api/users/${promote.id}`, {
    method: "PATCH",
    token: adminAccount.token,
    body: { role: "staff" },
  });
  await ok("an admin can change a role", () => {
    assert.equal(promoted.status, 200, promoted.text);
    assert.equal(promoted.json.data.role, "staff");
    assert.equal(promoted.json.data.email, promote.email);
  });

  const deactivated = await api(`/api/users/${promote.id}`, {
    method: "PATCH",
    token: adminAccount.token,
    body: { is_active: false },
  });
  const blocked = await api("/api/me", { token: promote.token });
  await ok("deactivation takes effect on the next request", () => {
    assert.equal(deactivated.status, 200, deactivated.text);
    assert.equal(deactivated.json.data.is_active, false);
    assert.equal(blocked.status, 403);
  });

  const selfOff = await api(`/api/users/${adminAccount.id}`, {
    method: "PATCH",
    token: adminAccount.token,
    body: { is_active: false },
  });
  const selfDemote = await api(`/api/users/${adminAccount.id}`, {
    method: "PATCH",
    token: adminAccount.token,
    body: { role: "customer" },
  });
  await ok("an admin cannot lock themselves out", () => {
    assert.equal(selfOff.status, 409);
    assert.equal(selfDemote.status, 409);
  });

  const badRole = await api(`/api/users/${customer.id}`, {
    method: "PATCH",
    token: adminAccount.token,
    body: { role: "owner" },
  });
  const unknownUser = await api("/api/users/00000000-0000-4000-8000-000000000000", {
    method: "PATCH",
    token: adminAccount.token,
    body: { role: "staff" },
  });
  await ok("bad roles and unknown users are refused", () => {
    assert.equal(badRole.status, 400);
    assert.equal(badRole.json.details[0].path, "role");
    assert.equal(unknownUser.status, 404);
  });

  console.log("--- dashboard summary");

  const customerSummary = await api("/api/reports/summary", { token: customer.token });
  const staffSummary = await api("/api/reports/summary", { token: staff.token });
  const adminSummary = await api("/api/reports/summary", { token: adminAccount.token });

  await ok("customers cannot open the dashboard", () => assert.equal(customerSummary.status, 403));

  await ok("staff get the shop view without money", () => {
    assert.equal(staffSummary.status, 200, staffSummary.text);
    assert.equal(staffSummary.json.data.sales, null);
    assert.ok(staffSummary.json.data.low_stock.some((product) => product.id === low.id));
    assert.ok(staffSummary.json.data.recent_orders.length >= 1);
    assert.ok(staffSummary.json.data.counts.customers >= 1);
  });

  await ok("admins get the sales totals too", () => {
    assert.equal(adminSummary.status, 200, adminSummary.text);
    assert.ok(adminSummary.json.data.sales, "sales is null for an admin");
    assert.ok(adminSummary.json.data.sales.revenue >= 500, `revenue ${adminSummary.json.data.sales.revenue}`);
    assert.ok(adminSummary.json.data.sales.orders >= 1);
    assert.ok(adminSummary.json.data.sales.average > 0);
  });

  console.log("--- reports");

  const staffReport = await api("/api/reports/sales", { token: staff.token });
  await ok("staff cannot reach financial reports", () => assert.equal(staffReport.status, 403));

  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);

  const sales = await api(`/api/reports/sales?from=${from}&to=${to}`, { token: adminAccount.token });
  await ok("the sales report totals the paid order", () => {
    assert.equal(sales.status, 200, sales.text);
    const revenue = sales.json.data.reduce((sum, row) => sum + row.revenue, 0);
    assert.ok(revenue >= 500, `revenue ${revenue}`);
    assert.ok(sales.json.data.every((row) => typeof row.day === "string"));
  });

  const csv = await api(`/api/reports/sales?from=${from}&to=${to}&format=csv`, {
    token: adminAccount.token,
  });
  await ok("CSV comes back as a download", () => {
    assert.equal(csv.status, 200, csv.text);
    assert.match(csv.headers.get("content-type"), /text\/csv/);
    assert.match(csv.headers.get("content-disposition"), /attachment; filename="sales-\d{4}-\d{2}-\d{2}\.csv"/);
    assert.ok(csv.text.startsWith("Day,Orders,Revenue"), csv.text.slice(0, 60));
    assert.ok(csv.text.split("\r\n").length >= 2, "no data rows");
  });

  const inventory = await api("/api/reports/inventory", { token: adminAccount.token });
  await ok("the inventory report values the stock", () => {
    assert.equal(inventory.status, 200, inventory.text);
    const row = inventory.json.data.find((entry) => entry.name.includes("Phase 4 sold"));
    assert.ok(row, "the sold product is missing");
    assert.equal(row.stock_qty, 50);
    assert.equal(row.stock_value, 12500);
    assert.equal(row.low, false);
  });

  const lowStock = await api("/api/reports/low-stock", { token: adminAccount.token });
  await ok("the low-stock report shows the shortfall", () => {
    const row = lowStock.json.data.find((entry) => entry.name.includes("Phase 4 low"));
    assert.ok(row, "the low product is missing");
    assert.equal(row.stock_qty, 1);
    assert.equal(row.shortfall, 4);
  });

  const top = await api(`/api/reports/top-products?from=${from}&to=${to}`, {
    token: adminAccount.token,
  });
  await ok("top products rank by units sold", () => {
    const row = top.json.data.find((entry) => entry.name.includes("Phase 4 sold"));
    assert.ok(row, "the sold product is missing");
    assert.equal(row.quantity, 2);
    assert.equal(row.revenue, 500);
  });

  const badType = await api("/api/reports/nonsense", { token: adminAccount.token });
  const badFormat = await api("/api/reports/sales?format=xml", { token: adminAccount.token });
  const badDate = await api("/api/reports/sales?from=not-a-date", { token: adminAccount.token });
  await ok("bad report input is refused", () => {
    assert.equal(badType.status, 404);
    assert.equal(badFormat.status, 400);
    assert.equal(badFormat.json.details[0].path, "format");
    assert.equal(badDate.status, 400);
    assert.equal(badDate.json.details[0].path, "from");
  });

  console.log("--- push");

  const anonymousKey = await api("/api/push/public-key");
  const key = await api("/api/push/public-key", { token: customer.token });
  await ok("the public key is for signed-in accounts only", () => {
    assert.equal(anonymousKey.status, 401);
    assert.equal(key.status, 200, key.text);
    assert.equal(key.json.key, vapid.publicKey);
  });

  const badSubscription = await api("/api/push/subscribe", {
    method: "POST",
    token: customer.token,
    body: { endpoint: "not-a-url", keys: {} },
  });
  await ok("a malformed subscription is a 400", () => assert.equal(badSubscription.status, 400));

  const subscribed = await api("/api/push/subscribe", {
    method: "POST",
    token: customer.token,
    body: { endpoint, keys: { p256dh: "p256dh-test", auth: "auth-test" } },
  });
  const stored = await admin
    .from("push_subscriptions")
    .select("id, user_id")
    .eq("endpoint", endpoint);

  await ok("a subscription is stored against the account", () => {
    assert.equal(subscribed.status, 201, subscribed.text);
    assert.equal(stored.data.length, 1);
    assert.equal(stored.data[0].user_id, customer.id);
  });

  const resubscribed = await api("/api/push/subscribe", {
    method: "POST",
    token: customer.token,
    body: { endpoint, keys: { p256dh: "p256dh-second", auth: "auth-second" } },
  });
  const afterResubscribe = await admin
    .from("push_subscriptions")
    .select("p256dh")
    .eq("endpoint", endpoint);

  await ok("re-subscribing the same endpoint updates one row", () => {
    assert.equal(resubscribed.status, 201, resubscribed.text);
    assert.equal(afterResubscribe.data.length, 1);
    assert.equal(afterResubscribe.data[0].p256dh, "p256dh-second");
  });

  const staffUnsubscribe = await api("/api/push/unsubscribe", {
    method: "POST",
    token: staff.token,
    body: { endpoint },
  });
  const afterStaffUnsubscribe = await admin
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint);

  await ok("unsubscribing is scoped to the caller", () => {
    assert.equal(staffUnsubscribe.status, 204);
    assert.equal(afterStaffUnsubscribe.data.length, 1);
  });

  const unsubscribed = await api("/api/push/unsubscribe", {
    method: "POST",
    token: customer.token,
    body: { endpoint },
  });
  const afterUnsubscribe = await admin
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint);

  await ok("the owner removes the subscription", () => {
    assert.equal(unsubscribed.status, 204);
    assert.equal(afterUnsubscribe.data.length, 0);
  });

  await ok("sending with no subscriptions is a quiet no-op", async () => {
    assert.equal(await sendPushToUser(customer.id, { title: "Test" }), 0);
  });
} catch (error) {
  failures += 1;
  console.error(`\nFAIL ${error.message}\n${error.stack ?? ""}`);
} finally {
  globalThis.fetch = realFetch;

  try {
    await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (created.orders.length) await admin.from("orders").delete().in("id", created.orders);
    if (created.products.length) await admin.from("products").delete().in("id", created.products);
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
