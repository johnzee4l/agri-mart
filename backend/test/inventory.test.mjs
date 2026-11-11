import assert from "node:assert/strict";
import net from "node:net";

import { ensureDatabase } from "./support.mjs";

/* FR-10, FR-11. Inventory log, low-stock list, adjustments and the low-stock email,
   against a real database. Mail goes to a small local SMTP sink, so delivery is
   actually exercised rather than assumed.

   Run with `npm test` from backend/. */

const PASSWORD = "Phase4-test-pass";
const database = ensureDatabase();

process.env.SUPABASE_URL = database.url;
process.env.SUPABASE_SERVICE_ROLE_KEY = database.serviceKey;
process.env.PAYMONGO_SECRET_KEY = "sk_test_phase4";
process.env.PAYMONGO_WEBHOOK_SECRET = "whsec_local_phase4";
process.env.PORT = "0";

/** Minimal SMTP catcher: enough for Nodemailer's plain-text send. */
function startSmtpSink() {
  const messages = [];

  const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    socket.write("220 agrimart.test ESMTP sink\r\n");

    let buffer = "";
    let inData = false;
    let data = "";

    socket.on("data", (chunk) => {
      buffer += chunk;

      let index = buffer.indexOf("\r\n");
      while (index >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);

        if (inData) {
          if (line === ".") {
            inData = false;
            messages.push(data);
            data = "";
            socket.write("250 OK\r\n");
          } else {
            data += `${line}\n`;
          }
        } else {
          const command = line.toUpperCase();

          if (command.startsWith("EHLO") || command.startsWith("HELO")) {
            socket.write("250-agrimart.test\r\n250 OK\r\n");
          } else if (command.startsWith("DATA")) {
            inData = true;
            socket.write("354 End with a line containing only a dot\r\n");
          } else if (command.startsWith("QUIT")) {
            socket.write("221 Bye\r\n");
            socket.end();
          } else {
            socket.write("250 OK\r\n");
          }
        }

        index = buffer.indexOf("\r\n");
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, messages, port: server.address().port });
    });
  });
}

const sink = await startSmtpSink();
process.env.SMTP_USER = "orders@agrimart.test";
process.env.SMTP_PASS = "test";
process.env.SMTP_HOST = "127.0.0.1";
process.env.SMTP_PORT = String(sink.port);
delete process.env.SMTP_AUTH;

const realFetch = globalThis.fetch;
const { supabase } = await import("../src/lib/supabase.js");
const { server, io } = await import("../src/index.js");

if (!server.listening) await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const admin = supabase();

const stamp = Date.now();
const created = { users: [], products: [], orders: [] };
let realEmit = null;

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

  return { status: response.status, json, text };
};

async function createAccount(label, role = "customer") {
  const email = `phase4+${label}+${stamp}@agrimart.test`;
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

async function createProduct(name, { stock, reorder, price = 10 } = {}) {
  const { data, error } = await admin
    .from("products")
    .insert({ name: `Phase 4 ${name} ${stamp}`, price, stock_qty: stock, reorder_level: reorder, unit: "kg" })
    .select("*")
    .single();

  assert.equal(error, null, `create product ${name}: ${error?.message}`);
  created.products.push(data.id);
  return data;
}

async function waitForEmail(predicate, timeoutMs = 5000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const match = sink.messages.find(predicate);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return null;
}

async function sweepLeftovers() {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });

  for (const user of data?.users ?? []) {
    if (user.email?.startsWith("phase4+")) await admin.auth.admin.deleteUser(user.id);
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

  const feed = await createProduct("feed", { stock: 2, reorder: 10 });
  const archived = await createProduct("archived", { stock: 1, reorder: 10 });

  console.log("--- access");

  const customerLogs = await api("/api/inventory/logs", { token: customer.token });
  const customerLow = await api("/api/inventory/low-stock", { token: customer.token });
  const customerAdjust = await api("/api/inventory/adjust", {
    method: "POST",
    token: customer.token,
    body: { product_id: feed.id, change_qty: 1, reason: "stock-in" },
  });

  await ok("customers cannot read or change inventory", () => {
    assert.equal(customerLogs.status, 403);
    assert.equal(customerLow.status, 403);
    assert.equal(customerAdjust.status, 403);
  });

  console.log("--- low-stock list and adjustments");

  const before = await api("/api/inventory/low-stock", { token: staff.token });
  await ok("the low-stock list is live and staff-readable", () => {
    assert.equal(before.status, 200, before.text);
    const row = before.json.data.find((product) => product.id === feed.id);
    assert.ok(row, "the low product is missing");
    assert.equal(row.stock_qty, 2);
    assert.equal(row.reorder_level, 10);
  });

  const emitted = [];
  realEmit = io.emit.bind(io);
  io.emit = (event, payload) => {
    emitted.push({ event, payload });
    return realEmit(event, payload);
  };

  const stockIn = await api("/api/inventory/adjust", {
    method: "POST",
    token: staff.token,
    body: { product_id: feed.id, change_qty: 5, reason: "stock-in" },
  });

  await ok("stock-in adds stock and reports the product still low", () => {
    assert.equal(stockIn.status, 201, stockIn.text);
    assert.equal(stockIn.json.data.stock_qty, 7);
    assert.equal(stockIn.json.low_stock, true);
  });

  await ok("an adjustment broadcasts the new quantity", () => {
    const event = emitted.find((entry) => entry.event === "stock" && entry.payload.product_id === feed.id);
    assert.ok(event, `no stock event in ${JSON.stringify(emitted)}`);
    assert.equal(event.payload.stock_qty, 7);
  });

  const alert = await waitForEmail((message) => message.includes("Phase 4 feed"));
  await ok("the low-stock email reaches the admin", () => {
    assert.ok(alert, "no low-stock email arrived at the SMTP sink");
    assert.match(alert, /7 left \(reorder at 10\)/);
    assert.ok(alert.includes(adminAccount.email), "the alert was not addressed to the admin");
  });

  const restock = await api("/api/inventory/adjust", {
    method: "POST",
    token: adminAccount.token,
    body: { product_id: feed.id, change_qty: 10, reason: "stock-in" },
  });

  await ok("a restock above the reorder level is not low", () => {
    assert.equal(restock.status, 201, restock.text);
    assert.equal(restock.json.data.stock_qty, 17);
    assert.equal(restock.json.low_stock, false);
  });

  const after = await api("/api/inventory/low-stock", { token: staff.token });
  await ok("a restocked product leaves the low-stock list", () =>
    assert.equal(
      after.json.data.some((product) => product.id === feed.id),
      false,
    ),
  );

  console.log("--- log and validation");

  const logs = await api(`/api/inventory/logs?product_id=${feed.id}`, { token: staff.token });
  await ok("the log lists both stock-in rows newest first", () => {
    assert.equal(logs.status, 200, logs.text);
    assert.equal(logs.json.total, 2);
    assert.deepEqual(
      logs.json.data.map((row) => row.change_qty),
      [10, 5],
    );
    assert.equal(logs.json.data[0].reason, "stock-in");
    assert.equal(logs.json.data[0].user_id, adminAccount.id);
    assert.match(logs.json.data[0].products.name, /Phase 4 feed/);
  });

  const badReason = await api("/api/inventory/logs?reason=bogus", { token: staff.token });
  const badProduct = await api("/api/inventory/logs?product_id=not-a-uuid", { token: staff.token });
  await ok("bad log filters are 400s", () => {
    assert.equal(badReason.status, 400);
    assert.equal(badReason.json.details[0].path, "reason");
    assert.equal(badProduct.status, 400);
    assert.equal(badProduct.json.details[0].path, "product_id");
  });

  const zero = await api("/api/inventory/adjust", {
    method: "POST",
    token: staff.token,
    body: { product_id: feed.id, change_qty: 0, reason: "adjustment" },
  });
  const negativeStockIn = await api("/api/inventory/adjust", {
    method: "POST",
    token: staff.token,
    body: { product_id: feed.id, change_qty: -5, reason: "stock-in" },
  });
  const positiveSpoilage = await api("/api/inventory/adjust", {
    method: "POST",
    token: staff.token,
    body: { product_id: feed.id, change_qty: 5, reason: "spoilage" },
  });

  await ok("nonsense adjustments are refused with a field path", () => {
    assert.equal(zero.status, 400);
    assert.equal(zero.json.details[0].path, "change_qty");
    assert.equal(negativeStockIn.status, 400);
    assert.equal(positiveSpoilage.status, 400);
  });

  const belowZero = await api("/api/inventory/adjust", {
    method: "POST",
    token: staff.token,
    body: { product_id: feed.id, change_qty: -500, reason: "spoilage" },
  });
  await ok("spoilage cannot take stock below zero", () => assert.equal(belowZero.status, 409));

  const stockAfterRefusal = await admin.from("products").select("stock_qty").eq("id", feed.id).single();
  await ok("a refused adjustment changes nothing", () => assert.equal(stockAfterRefusal.data.stock_qty, 17));

  await admin.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", archived.id);
  const adjustArchived = await api("/api/inventory/adjust", {
    method: "POST",
    token: staff.token,
    body: { product_id: archived.id, change_qty: 1, reason: "stock-in" },
  });
  await ok("archived products cannot be adjusted", () => assert.equal(adjustArchived.status, 409));

  console.log("--- low stock after a deduction");

  const drop = await createProduct("drop", { stock: 8, reorder: 9, price: 20 });
  const codOrder = await api("/api/orders", {
    method: "POST",
    token: customer.token,
    body: {
      items: [{ product_id: drop.id, qty: 1 }],
      fulfillment_type: "pickup",
      method: "cod",
    },
  });

  assert.equal(codOrder.status, 201, `cod order: ${codOrder.text}`);
  created.orders.push(codOrder.json.order.id);

  const preparing = await api(`/api/orders/${codOrder.json.order.id}/status`, {
    method: "PATCH",
    token: staff.token,
    body: { status: "preparing" },
  });

  await ok("confirming a COD order deducts stock", () => {
    assert.equal(preparing.status, 200, preparing.text);
    assert.equal(preparing.json.data.status, "preparing");
  });

  const deductionAlert = await waitForEmail((message) => message.includes("Phase 4 drop"));
  await ok("a deduction that hits the reorder level emails the admin", () =>
    assert.ok(deductionAlert, "no low-stock email for the deduction"),
  );

  const saleLogs = await api(`/api/inventory/logs?product_id=${drop.id}&reason=sale`, {
    token: staff.token,
  });
  await ok("the deduction is in the log as a sale", () => {
    assert.equal(saleLogs.status, 200, saleLogs.text);
    assert.equal(saleLogs.json.total, 1);
    assert.equal(saleLogs.json.data[0].change_qty, -1);
    assert.equal(saleLogs.json.data[0].reason, "sale");
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
    for (const id of created.users) await admin.auth.admin.deleteUser(id);
  } catch (error) {
    console.error(`[cleanup] ${error.message}`);
  }

  sink.server.close();
  io.close();
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
}

console.log(`\n${failures === 0 ? "all checks passed" : `${failures} check(s) failed`}`);
process.exitCode = failures === 0 ? 0 : 1;
