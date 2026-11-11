import assert from "node:assert/strict";

import { ensureDatabase } from "./support.mjs";

/* Member 2 Phase 5 security pass, against the real middleware and routes:

     1. helmet headers, and no x-powered-by
     2. CORS: the allowlisted origin is echoed, a foreign origin is refused
     3. every protected route answers 401 without a token, and staff cannot open
        admin-only routes (403)
     4. a malformed body or query is a 400 with a field path, never a 500
     5. the global limiter and the strict login limiter both answer 429

   The "no raw SQL and no secrets in code" half of the pass is a source audit: every
   database call goes through supabase-js builders or named-parameter rpc functions,
   and the only environment value a client ever sees is the VAPID public key.

   Run with `npm test` from backend/. */

const PASSWORD = "Phase5-sec-pass";
const ALLOWED_ORIGIN = "http://localhost:5173";
const FOREIGN_ORIGIN = "https://evil.example";

const database = ensureDatabase();
process.env.SUPABASE_URL = database.url;
process.env.SUPABASE_SERVICE_ROLE_KEY = database.serviceKey;
process.env.PAYMONGO_SECRET_KEY = "sk_test_phase5_sec";
process.env.PAYMONGO_WEBHOOK_SECRET = "whsec_local_phase5_sec";
process.env.FRONTEND_URL = ALLOWED_ORIGIN;
process.env.PORT = "0";
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

const realFetch = globalThis.fetch;
const { supabase } = await import("../src/lib/supabase.js");
const { server, io } = await import("../src/index.js");

if (!server.listening) await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const admin = supabase();

const stamp = Date.now();
const created = { users: [] };

/** Returns the response so header assertions can reach it too. */
const raw = async (route, { method = "GET", token, origin, body, contentType, headers = {} } = {}) => {
  return realFetch(`${base}${route}`, {
    method,
    headers: {
      ...(contentType ? { "Content-Type": contentType } : body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(origin ? { Origin: origin } : {}),
      ...headers,
    },
    body: typeof body === "string" ? body : body ? JSON.stringify(body) : undefined,
  });
};

const api = async (route, options) => {
  const response = await raw(route, options);
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
  const email = `phase5+sec+${label}+${stamp}@agrimart.test`;
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

  // Straight to GoTrue, so the suite's own sign-ins never spend the login limiter.
  const response = await realFetch(`${database.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: database.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const session = await response.json();
  assert.equal(response.status, 200, `sign in ${label}: ${JSON.stringify(session)}`);

  return { id: data.user.id, email, token: session.access_token };
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
    if (user.email?.startsWith("phase5+sec+")) await admin.auth.admin.deleteUser(user.id);
  }
}

try {
  console.log("--- setup");
  await sweepLeftovers();

  const staff = await createAccount("staff", "staff");
  const owner = await createAccount("admin", "admin");
  const customer = await createAccount("buyer");

  console.log("--- headers and origin");

  const health = await api("/api/health", { origin: ALLOWED_ORIGIN });
  const foreign = await api("/api/health", { origin: FOREIGN_ORIGIN });
  const preflight = await raw("/api/health", {
    method: "OPTIONS",
    origin: ALLOWED_ORIGIN,
    headers: { "Access-Control-Request-Method": "GET" },
  });

  await ok("helmet sets its headers and the stack is not advertised", () => {
    assert.equal(health.status, 200, health.text);
    assert.equal(health.headers.get("x-content-type-options"), "nosniff");
    assert.equal(health.headers.get("x-powered-by"), null);
    assert.ok(health.headers.get("x-frame-options"), "no clickjacking header");
  });

  await ok("only the allowlisted origin is echoed back", () => {
    assert.equal(health.headers.get("access-control-allow-origin"), ALLOWED_ORIGIN);
    assert.equal(foreign.status, 403, foreign.text);
    assert.equal(foreign.json.error, "Origin not allowed");
    assert.equal(foreign.headers.get("access-control-allow-origin"), null);
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), ALLOWED_ORIGIN);
  });

  console.log("--- access");

  const protectedRoutes = [
    ["GET", "/api/me"],
    ["GET", "/api/me/addresses"],
    ["GET", "/api/orders"],
    ["POST", "/api/orders"],
    ["GET", "/api/inventory/logs"],
    ["POST", "/api/inventory/adjust"],
    ["GET", "/api/users"],
    ["GET", "/api/reports/summary"],
    ["GET", "/api/reports/sales"],
    ["POST", "/api/uploads"],
    ["GET", "/api/push/public-key"],
    ["POST", "/api/push/subscribe"],
    ["PUT", "/api/content/home_hero"],
  ];

  const anonymous = [];
  for (const [method, route] of protectedRoutes) {
    anonymous.push({ route, response: await api(route, { method }) });
  }

  await ok("every protected route refuses an anonymous caller", () => {
    const open = anonymous.filter(({ response }) => response.status !== 401);
    assert.deepEqual(
      open.map(({ route, response }) => `${route} -> ${response.status}`),
      [],
    );
  });

  await ok("a bad token is a 401, not a 500", async () => {
    const response = await api("/api/me", { token: "not-a-real-jwt" });
    assert.equal(response.status, 401, response.text);
  });

  const staffBlocked = [
    ["GET", "/api/users"],
    ["GET", "/api/reports/sales"],
    ["GET", "/api/reports/low-stock"],
    ["PUT", "/api/content/home_hero"],
    ["POST", "/api/products"],
    ["POST", "/api/uploads"],
  ];

  const forbidden = [];
  for (const [method, route] of staffBlocked) {
    forbidden.push({ route, response: await api(route, { method, token: staff.token }) });
  }

  await ok("staff cannot reach user management, reports or uploads", () => {
    const allowed = forbidden.filter(({ response }) => response.status !== 403);
    assert.deepEqual(
      allowed.map(({ route, response }) => `${route} -> ${response.status}`),
      [],
    );
  });

  console.log("--- query validation");

  const badQueries = [
    [customer, "/api/orders?from=not-a-date", "from"],
    [customer, "/api/orders?status=teleported", "status"],
    [staff, "/api/inventory/logs?to=2026-13-45", "to"],
    [staff, "/api/inventory/logs?product_id=not-a-uuid", "product_id"],
    [owner, "/api/users?role=wizard", "role"],
    [owner, "/api/users?is_active=maybe", "is_active"],
    [owner, "/api/reports/sales?format=xml", "format"],
    [owner, "/api/reports/sales?from=2026-05-01&to=2026-04-01", "from"],
    [owner, "/api/products?sort=bogus", "sort"],
    [owner, "/api/products?minPrice=cheap", "minPrice"],
  ];

  const checked = [];
  for (const [account, route, field] of badQueries) {
    checked.push({ route, field, response: await api(route, { token: account.token }) });
  }

  await ok("a malformed query is a 400 that names the field", () => {
    const wrong = checked.filter(
      ({ response, field }) =>
        response.status !== 400 || response.json?.details?.[0]?.path !== field,
    );
    assert.deepEqual(
      wrong.map(({ route, field, response }) => `${route} -> ${response.status} (${JSON.stringify(response.json?.details)}) wanting ${field}`),
      [],
    );
  });

  await ok("an unknown report type is a 404, not a crash", async () => {
    const response = await api("/api/reports/nonsense", { token: owner.token });
    assert.equal(response.status, 404, response.text);
  });

  console.log("--- body validation");

  const bodies = {
    register: await api("/api/auth/register", {
      method: "POST",
      body: { email: "nope", password: "short", full_name: "A" },
    }),
    order: await api("/api/orders", {
      method: "POST",
      token: customer.token,
      body: {
        items: [{ product_id: "not-a-uuid", qty: 0 }],
        fulfillment_type: "teleport",
        method: "cash",
      },
    }),
    adjust: await api("/api/inventory/adjust", {
      method: "POST",
      token: staff.token,
      body: { product_id: "00000000-0000-4000-8000-000000000000", change_qty: "abc", reason: "nope" },
    }),
    subscribe: await api("/api/push/subscribe", {
      method: "POST",
      token: customer.token,
      body: { endpoint: "not-a-url", keys: {} },
    }),
  };

  await ok("a malformed body is a 400 with a field path, not a 500", () => {
    for (const [name, response] of Object.entries(bodies)) {
      assert.equal(response.status, 400, `${name}: ${response.text}`);
      assert.equal(response.json?.error, "Validation failed", name);

      const details = response.json?.details ?? [];
      assert.ok(details.length > 0, `${name} reported no fields`);
      assert.ok(
        details.every((detail) => typeof detail.path === "string" && detail.message),
        `${name}: ${JSON.stringify(details)}`,
      );
    }
  });

  await ok("unparseable JSON and an oversized body are refused", async () => {
    const malformed = await api("/api/orders", {
      method: "POST",
      token: customer.token,
      body: "{not json",
      contentType: "application/json",
    });
    assert.equal(malformed.status, 400, malformed.text);

    const oversized = await api("/api/orders", {
      method: "POST",
      token: customer.token,
      body: JSON.stringify({ filler: "x".repeat(1_200_000) }),
    });
    assert.equal(oversized.status, 413, `expected 413, got ${oversized.status}`);
  });

  console.log("--- rate limits");

  const attempts = [];
  for (let index = 0; index < 6; index += 1) {
    attempts.push(
      await api("/api/auth/login", {
        method: "POST",
        body: { email: customer.email, password: "definitely-wrong" },
      }),
    );
  }

  await ok("six wrong sign-ins in a minute are rate limited", () => {
    assert.deepEqual(
      attempts.slice(0, 5).map((response) => response.status),
      [401, 401, 401, 401, 401],
      `unexpected answers: ${attempts.map((response) => response.status).join(", ")}`,
    );
    assert.equal(attempts[5].status, 429, attempts[5].text);
    assert.match(attempts[5].json.error, /Too many sign-in attempts/);
  });

  let firstHealth = null;
  let limited = null;
  let seen = 0;

  for (let index = 0; index < 400 && !limited; index += 1) {
    const response = await api("/api/health");
    seen += 1;
    if (!firstHealth) firstHealth = response;
    if (response.status === 429) limited = response;
  }

  await ok("the global limiter answers 429 instead of dropping requests", () => {
    assert.ok(limited, `no 429 after ${seen} requests`);
    assert.ok(seen > 1, "the limiter kicked in on the first request");
  });

  await ok("rate-limit headers are advertised on a normal response", () => {
    const advertised = [...firstHealth.headers.keys()].filter((key) =>
      key.toLowerCase().startsWith("ratelimit"),
    );
    assert.ok(advertised.length > 0, `no rate-limit headers: ${advertised.join(", ")}`);
  });
} catch (error) {
  failures += 1;
  console.error(`\nFAIL ${error.message}\n${error.stack ?? ""}`);
} finally {
  try {
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
