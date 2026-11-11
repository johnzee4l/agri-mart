import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* Boots the local Supabase stack and applies database/migrations so the backend
   tests run against real Postgres, GoTrue and PostgREST.

   Point the tests at a hosted project instead by exporting SUPABASE_URL,
   SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY; the stack is then left alone. */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function run(command, args, { input, timeout = 300_000 } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    input,
    timeout,
    shell: process.platform === "win32",
  });

  if (result.error) throw new Error(`${command} could not run: ${result.error.message}`);

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited ${result.status}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    );
  }

  return result.stdout ?? "";
}

/** `supabase status -o env` as a plain object. */
export function readStatus() {
  const output = run("supabase", ["status", "-o", "env"]);
  const env = {};

  for (const line of output.split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Z0-9_]+)="?([^"]*?)"?$/);
    if (match) env[match[1]] = match[2];
  }

  return env;
}

function ensureStack() {
  let status = null;
  try {
    status = readStatus();
  } catch {
    status = null;
  }

  if (status?.API_URL) return status;

  if (!fs.existsSync(path.join(root, "supabase/config.toml"))) {
    run("supabase", ["init"], { input: "n\n" });
  }

  console.log("[db] starting the local Supabase stack (first run pulls images)");
  run(
    "supabase",
    [
      "start",
      "-x",
      "studio,imgproxy,storage-api,realtime,edge-runtime,mailpit,logflare,vector",
    ],
    { timeout: 600_000 },
  );

  return readStatus();
}

function applyMigrations() {
  const containers = run("docker", [
    "ps",
    "--filter",
    "name=supabase_db_",
    "--format",
    "{{.Names}}",
  ])
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  const container = containers[0];
  if (!container) {
    throw new Error("No supabase_db_ container is running; start the stack with `supabase start`.");
  }

  const directory = path.join(root, "database/migrations");
  const files = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const result = spawnSync(
      "docker",
      ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-f", "-"],
      { cwd: root, encoding: "utf8", input: fs.readFileSync(path.join(directory, file), "utf8") },
    );

    if (result.status !== 0) {
      throw new Error(`migration ${file} failed\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
    }
  }

  console.log(`[db] applied ${files.length} migration file(s) to ${container}`);
}

/**
 * @returns {{ url: string, serviceKey: string, anonKey: string }}
 */
export function ensureDatabase() {
  const hostedUrl = process.env.SUPABASE_URL;
  const hostedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (hostedUrl && hostedKey) {
    console.log(`[db] using hosted project ${hostedUrl}`);
    return {
      url: hostedUrl,
      serviceKey: hostedKey,
      anonKey: process.env.SUPABASE_ANON_KEY ?? hostedKey,
    };
  }

  const status = ensureStack();
  applyMigrations();

  const url = status.API_URL;
  const serviceKey = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
  const anonKey = status.ANON_KEY ?? status.PUBLISHABLE_KEY ?? serviceKey;

  if (!url || !serviceKey) {
    throw new Error("Could not read API_URL and a service key from `supabase status -o env`.");
  }

  return { url, serviceKey, anonKey };
}
