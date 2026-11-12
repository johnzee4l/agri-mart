import { randomBytes } from "node:crypto";
import http from "node:http";
import https from "node:https";

/* Post-deploy smoke test for one origin (Phase 5: confirm HTTPS and WebSocket).

     npm run smoke -- https://agrimart-api.onrender.com
     SMOKE_URL=http://localhost:4000 SMOKE_ORIGIN=http://localhost:5173 npm run smoke

   It checks the process, the database behind it, the CORS allowlist, the auth gate and
   the Socket.IO upgrade that chat needs, then exits 1 if anything failed. It never signs
   in, so it is safe to run against production; the device push check stays manual
   (docs/deploy.md section 9). */

const target = (process.argv[2] ?? process.env.SMOKE_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const origin = process.env.SMOKE_ORIGIN ?? "http://localhost:5173";
const base = new URL(target);

let failures = 0;

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function send(path, { headers = {}, method = "GET" } = {}) {
  const response = await fetch(`${target}${path}`, { method, headers, redirect: "manual" });
  const text = await response.text();

  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return { status: response.status, json, text, headers: response.headers };
}

/** Engine.IO handshake: a real upgrade proves WebSocket traffic gets through. */
function upgrade() {
  return new Promise((resolve, reject) => {
    const client = base.protocol === "https:" ? https : http;

    const request = client.request(
      {
        protocol: base.protocol,
        hostname: base.hostname,
        port: base.port || (base.protocol === "https:" ? 443 : 80),
        path: "/socket.io/?EIO=4&transport=websocket",
        headers: {
          Connection: "Upgrade",
          Upgrade: "websocket",
          "Sec-WebSocket-Version": "13",
          "Sec-WebSocket-Key": randomBytes(16).toString("base64"),
          Origin: origin,
        },
      },
      (response) => {
        // A refusal arrives as a normal response.
        response.resume();
        resolve({ status: response.statusCode, headers: response.headers });
      },
    );

    request.on("upgrade", (response, socket) => {
      socket.destroy();
      resolve({ status: response.statusCode, headers: response.headers });
    });

    request.on("error", reject);
    request.setTimeout(20_000, () => request.destroy(new Error("timed out")));
    request.end();
  });
}

async function check(name, run) {
  try {
    const note = await run();
    console.log(`ok   ${name}${note ? ` — ${note}` : ""}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${name} -> ${error.message}`);
  }
}

console.log(`smoke test against ${target} (allowed origin ${origin})\n`);

await check("the origin is HTTPS, as push and the webhook require", () => {
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(target)) {
    return "skipped: a local origin is HTTP on purpose";
  }

  expect(target.startsWith("https://"), `${target} is not HTTPS`);
  return target;
});

await check("the process answers /api/health", async () => {
  const health = await send("/api/health");
  expect(health.status === 200, `got ${health.status}`);
  expect(health.json?.status === "ok", `unexpected body: ${health.text.slice(0, 120)}`);
  return `${health.json.service} at ${health.json.time}`;
});

await check("the database answers through the service key", async () => {
  const catalog = await send("/api/products?limit=1");
  expect(catalog.status === 200, `got ${catalog.status}: ${catalog.text.slice(0, 120)}`);
  expect(Array.isArray(catalog.json?.data), `unexpected body: ${catalog.text.slice(0, 120)}`);
  return `${catalog.json.data.length} product row(s), total ${catalog.json.total}`;
});

await check("CORS echoes the configured frontend origin", async () => {
  const allowed = await send("/api/health", { headers: { Origin: origin } });
  expect(
    allowed.headers.get("access-control-allow-origin") === origin,
    `FRONTEND_URL on the service does not include ${origin}`,
  );
  return origin;
});

await check("CORS refuses a foreign origin", async () => {
  const foreign = await send("/api/health", { headers: { Origin: "https://evil.example" } });
  expect(foreign.status === 403, `got ${foreign.status}`);
  expect(foreign.headers.get("access-control-allow-origin") === null, "a foreign origin was echoed");
});

await check("protected routes refuse anonymous callers", async () => {
  const guarded = await send("/api/me");
  expect(guarded.status === 401, `got ${guarded.status}`);
});

await check("the Socket.IO upgrade is accepted", async () => {
  const socket = await upgrade();
  expect(socket.status === 101, `got ${socket.status} instead of 101`);
  expect(
    String(socket.headers.upgrade ?? "").toLowerCase() === "websocket",
    `unexpected upgrade header: ${socket.headers.upgrade}`,
  );
  return "101 Switching Protocols";
});

await check("the push public key is readable by a signed-in account only", async () => {
  const key = await send("/api/push/public-key");
  expect(key.status === 401, `got ${key.status}`);
  return "401 without a token; check VAPID_PUBLIC_KEY in the browser once signed in";
});

console.log(`\n${failures === 0 ? "smoke test passed" : `${failures} check(s) failed`}`);
process.exitCode = failures === 0 ? 0 : 1;
