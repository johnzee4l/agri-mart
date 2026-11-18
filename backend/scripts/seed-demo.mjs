import { createClient } from "@supabase/supabase-js";

/* Creates the three local demo accounts with confirmed emails, so auth, chat,
   orders and the admin panel can be exercised without SMTP. Safe to re-run: an
   existing account is reused and its profile is updated to the intended role. */

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (backend/.env) first.");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ACCOUNTS = [
  {
    email: "customer@agrimart.local",
    password: "Customer123!",
    full_name: "Demo Customer",
    phone: "+63 917 000 0001",
    role: "customer",
  },
  {
    email: "staff@agrimart.local",
    password: "Staff123!",
    full_name: "Demo Staff",
    phone: "+63 917 000 0002",
    role: "staff",
  },
  {
    email: "admin@agrimart.local",
    password: "Admin123!",
    full_name: "Demo Admin",
    phone: "+63 917 000 0003",
    role: "admin",
  },
];

async function findUserId(email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data?.users?.find((user) => user.email?.toLowerCase() === email)?.id ?? null;
}

async function ensureAccount(account) {
  const created = await admin.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: { full_name: account.full_name, phone: account.phone },
  });

  let id = created.data?.user?.id ?? null;
  let wasCreated = Boolean(id);

  if (created.error) {
    if (!/already/i.test(created.error.message)) throw created.error;
    id = await findUserId(account.email);
    wasCreated = false;
  }

  if (!id) throw new Error(`Could not create or find ${account.email}`);

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id,
      full_name: account.full_name,
      phone: account.phone,
      role: account.role,
      is_active: true,
    },
    { onConflict: "id" },
  );

  if (profileError) throw profileError;

  return { id, wasCreated };
}

let customerId = null;

for (const account of ACCOUNTS) {
  try {
    const { id, wasCreated } = await ensureAccount(account);
    if (account.role === "customer") customerId = id;

    console.log(
      `${wasCreated ? "created" : "updated"} ${account.role.padEnd(8)} ${account.email}  ${account.password}`,
    );
  } catch (error) {
    console.error(`failed ${account.email}:`, error.message);
    process.exitCode = 1;
  }
}

/* One saved delivery address makes checkout and the map testable immediately. */
if (customerId) {
  const { data: existing, error: readError } = await admin
    .from("addresses")
    .select("id")
    .eq("user_id", customerId)
    .is("deleted_at", null)
    .limit(1);

  if (readError) {
    console.error("could not check the demo address:", readError.message);
    process.exitCode = 1;
  } else if (!existing?.length) {
    const { error: addressError } = await admin.from("addresses").insert({
      user_id: customerId,
      street: "123 Sample Street",
      barangay: "Barangay 1",
      municipality: "Manila",
      province: "Metro Manila",
      latitude: 14.5995,
      longitude: 120.9842,
      is_default: true,
    });

    if (addressError) {
      console.error("could not create the demo address:", addressError.message);
      process.exitCode = 1;
    } else {
      console.log("created  address  for customer@agrimart.local");
    }
  }
}
