import assert from "node:assert/strict";

import { ensureDatabase } from "../../backend/test/support.mjs";

/* Member 3 Phase 1: "Verify RLS: the anonymous key cannot read any table."

   Runs against the local Supabase stack (or a hosted project when SUPABASE_URL and
   SUPABASE_SERVICE_ROLE_KEY are exported, the same way the backend suite does), applying
   database/migrations first. Everything goes through PostgREST with the anon key, which
   is exactly the worst case: a leaked key in a browser.

     node database/tests/rls.test.mjs

   It also checks the signed-in side, so hardening the anonymous key cannot quietly break
   the policies the app relies on. */

const PASSWORD = "Phase1-rls-pass";

const TABLES = [
  "profiles",
  "addresses",
  "categories",
  "products",
  "inventory_logs",
  "orders",
  "order_items",
  "payments",
  "site_content",
  "announcements",
  "push_subscriptions",
  "conversations",
  "messages",
];

const database = ensureDatabase();
const stamp = Date.now();
const created = { users: [], products: [], orders: [] };

const rest = async (path, { method = "GET", key, token, body, prefer } = {}) => {
  const response = await fetch(`${database.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token ?? key}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
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

/** The key a browser would get. */
const asAnon = (path, options = {}) => rest(path, { ...options, key: database.anonKey });

/** The key only the server has. */
const asService = (path, options = {}) => rest(path, { ...options, key: database.serviceKey });

/** A signed-in customer: the anon key plus that account's access token. */
const asUser = (token, path, options = {}) => rest(path, { ...options, key: database.anonKey, token });

/** "Blocked" means: an error, or a permitted query that returned no rows. */
function blocked(response) {
  if (response.status >= 400) return `denied (${response.status})`;
  if (Array.isArray(response.json) && response.json.length === 0) return "no rows";
  return null;
}

function refusalOf(response) {
  return blocked(response) ?? `the anonymous key got ${response.status}: ${response.text.slice(0, 160)}`;
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

async function signUp(label) {
  const email = `phase1+rls+${label}+${stamp}@agrimart.test`;
  const response = await fetch(`${database.url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: database.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, data: { full_name: `Phase 1 ${label}` } }),
  });

  const json = await response.json();
  assert.equal(response.status, 200, `signup ${label}: ${JSON.stringify(json)}`);

  const user = json.user ?? json;
  created.users.push(user.id);

  const signIn = await fetch(`${database.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: database.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const session = await signIn.json();
  assert.equal(signIn.status, 200, `sign in ${label}: ${JSON.stringify(session)}`);

  return { id: user.id, email, token: session.access_token };
}

try {
  console.log("--- schema");

  const openapi = await asAnon("", { prefer: undefined });
  const exposed = Object.keys(openapi.json?.definitions ?? {}).sort();

  await ok("every table in the public schema is covered by this test", () => {
    assert.ok(exposed.length > 0, `PostgREST exposed no tables: ${openapi.status} ${openapi.text.slice(0, 120)}`);
    assert.deepEqual(
      exposed,
      [...TABLES].sort(),
      "a table was added or removed: extend TABLES and give it a policy",
    );
  });

  console.log("--- anonymous key");

  const reads = {};
  const inserts = {};

  for (const table of TABLES) {
    reads[table] = await asAnon(`${table}?select=*&limit=5`);
    inserts[table] = await asAnon(table, { method: "POST", body: {}, prefer: "return=representation" });
  }

  await ok("the anonymous key cannot read any of the 13 tables", () => {
    const leaked = TABLES.filter((table) => blocked(reads[table]) === null);
    assert.deepEqual(leaked, [], "these tables returned rows to the anon key");
  });

  await ok("the anonymous key cannot insert into any table", () => {
    const allowed = TABLES.filter((table) => inserts[table].status < 400);
    assert.deepEqual(allowed, [], "these tables accepted an anonymous insert");
  });

  await ok("the anonymous key cannot update or delete a row", async () => {
    const created$ = await asService("products", {
      method: "POST",
      body: { name: `Phase 1 RLS probe ${stamp}`, price: 100, stock_qty: 5, reorder_level: 1 },
      prefer: "return=representation",
    });

    assert.equal(created$.status, 201, `the service role could not create the probe: ${created$.text}`);
    const probe = created$.json[0];
    created.products.push(probe.id);

    const before = await asService(`products?select=price,deleted_at&id=eq.${probe.id}`);

    const update = await asAnon(`products?id=eq.${probe.id}`, {
      method: "PATCH",
      body: { price: 1 },
      prefer: "return=representation",
    });
    const remove = await asAnon(`products?id=eq.${probe.id}`, {
      method: "DELETE",
      prefer: "return=representation",
    });

    assert.ok(
      update.status >= 400 || (update.json ?? []).length === 0,
      `an anonymous update went through: ${refusalOf(update)}`,
    );
    assert.ok(
      remove.status >= 400 || (remove.json ?? []).length === 0,
      `an anonymous delete went through: ${refusalOf(remove)}`,
    );

    const after = await asService(`products?select=price,deleted_at&id=eq.${probe.id}`);
    assert.deepEqual(after.json, before.json, "the row changed even though the writes were refused");
  });

  console.log("--- signed-in customer");

  const alice = await signUp("alice");
  const bob = await signUp("bob");

  const bobOrder = await asService("orders", {
    method: "POST",
    body: { user_id: bob.id, fulfillment_type: "pickup", delivery_fee: 0, total_amount: 250 },
    prefer: "return=representation",
  });

  assert.equal(bobOrder.status, 201, `could not create bob's order: ${bobOrder.text}`);
  created.orders.push(bobOrder.json[0].id);

  await ok("a signed-in customer can still read the public catalog", async () => {
    const catalog = await asUser(alice.token, "products?select=id,name&limit=5");
    assert.equal(catalog.status, 200, catalog.text);
    assert.ok(catalog.json.length > 0, "the storefront would show an empty catalog");

    const content = await asUser(alice.token, "site_content?select=key&limit=1");
    assert.equal(content.status, 200, content.text);
    assert.ok(content.json.length > 0, "site content is unreadable for a signed-in customer");
  });

  await ok("a customer sees only their own orders", async () => {
    const own = await asUser(bob.token, `orders?select=id&id=eq.${bobOrder.json[0].id}`);
    assert.equal(own.status, 200, own.text);
    assert.equal(own.json.length, 1, "bob cannot read his own order");

    const other = await asUser(alice.token, `orders?select=id&id=eq.${bobOrder.json[0].id}`);
    assert.equal(other.json?.length ?? 0, 0, "a customer read another customer's order");

    const logs = await asUser(alice.token, "inventory_logs?select=id&limit=1");
    assert.equal(blocked(logs) !== null, true, `a customer read the stock log: ${logs.text.slice(0, 120)}`);
  });

  await ok("a customer cannot write to the catalog", async () => {
    const attempt = await asUser(alice.token, "products", {
      method: "POST",
      body: { name: `Phase 1 RLS forged ${stamp}`, price: 1 },
      prefer: "return=representation",
    });
    assert.ok(attempt.status >= 400, `a customer inserted a product: ${attempt.status}`);
  });
} catch (error) {
  failures += 1;
  console.error(`\nFAIL ${error.message}\n${error.stack ?? ""}`);
} finally {
  try {
    if (created.orders.length) {
      await asService(`orders?id=in.(${created.orders.join(",")})`, { method: "DELETE" });
    }
    if (created.products.length) {
      await asService(`products?id=in.(${created.products.join(",")})`, { method: "DELETE" });
    }
    for (const id of created.users) {
      await fetch(`${database.url}/auth/v1/admin/users/${id}`, {
        method: "DELETE",
        headers: { apikey: database.serviceKey, Authorization: `Bearer ${database.serviceKey}` },
      });
    }
  } catch (error) {
    console.error(`[cleanup] ${error.message}`);
  }
}

console.log(`\n${failures === 0 ? "all checks passed" : `${failures} check(s) failed`}`);
process.exitCode = failures === 0 ? 0 : 1;
