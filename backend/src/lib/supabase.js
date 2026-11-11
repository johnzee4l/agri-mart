import { createClient } from "@supabase/supabase-js";

/* Service-role client. The browser never talks to Supabase (blueprint 3.2),
   so this is the only Supabase client in the system. Created lazily so the API
   boots and answers /api/health before credentials are set. */
let client = null;

export function supabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env");
  }

  client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return client;
}
