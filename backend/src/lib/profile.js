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
