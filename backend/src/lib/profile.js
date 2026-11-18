import { supabase } from "./supabase.js";
import { ApiError } from "./errors.js";

/* One profile reader shared by the auth middleware, /auth/login and /me, so the
   selected shape and the 404/500 behaviour cannot drift between them. */
export async function getProfile(userId) {
  const { data, error } = await supabase()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new ApiError(500, "Could not load the profile");
  if (!data) throw new ApiError(404, "Profile not found");

  return data;
}

/* Lists name people, not ids. One batched profile read per page of rows, then the
   caller merges the name in, so staff read "Maria Santos" instead of 7cfba8c2. */
export async function userProfiles(userIds) {
  const ids = [...new Set((userIds ?? []).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase()
    .from("profiles")
    .select("id, full_name, phone")
    .in("id", ids);

  if (error) throw new ApiError(500, "Could not load the account names");

  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

export async function withUserProfiles(rows, field = "customer") {
  const list = rows ?? [];
  const profiles = await userProfiles(list.map((row) => row.user_id));
  return list.map((row) => ({ ...row, [field]: profiles.get(row.user_id) ?? null }));
}

/** Every active admin, for the low-stock alert (FR-10). */
export async function getAdminEmails() {
  const { data, error } = await supabase()
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true);

  if (error) throw new ApiError(500, "Could not load the admin list");

  const emails = await Promise.all((data ?? []).map((admin) => getUserEmail(admin.id)));
  return [...new Set(emails.filter(Boolean))];
}

/** The address lives in auth.users, not profiles. Mail is best effort. */
export async function getUserEmail(userId) {
  const { data, error } = await supabase().auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}
