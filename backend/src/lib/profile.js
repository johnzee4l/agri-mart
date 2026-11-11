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

/** The address lives in auth.users, not profiles. Mail is best effort. */
export async function getUserEmail(userId) {
  const { data, error } = await supabase().auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}
