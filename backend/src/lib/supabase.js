import { createClient } from "@supabase/supabase-js";

/* Service-role client. The browser never talks to Supabase (blueprint 3.2),
   so this is the only Supabase client in the system. Created lazily so the API
   boots and answers /api/health before credentials are set. */
let client = null;

function credentials() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env");
  }

  return { url, key };
}

export function supabase() {
  if (client) return client;

  const { url, key } = credentials();

  client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return client;
}

/* Throwaway client for the auth calls that keep a session on the client they run on
   (signInWithPassword, refreshSession). supabase-js sends that session's token with every
   later table request, so signing in on the shared client would drop the API out of its
   service-role connection: reads come back scoped to whoever logged in last and writes
   to tables with no policy of their own fail with "new row violates row-level security".
   Route session-bearing auth through here and leave the data client alone. */
export function authClient() {
  const { url, key } = credentials();

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
