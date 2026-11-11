import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../lib/errors.js";
import { supabase } from "../lib/supabase.js";
import { auth, requireRole, validate } from "../middleware.js";
import { getUserEmail } from "../lib/profile.js";

/* FR-16. Admin user management: list accounts, change a role, deactivate or
   reactivate. Admin only; the auth middleware already rejects a deactivated account,
   so deactivation takes effect on that person's next request. */

export const usersRouter = Router();

usersRouter.use(auth, requireRole("admin"));

const ROLES = ["customer", "staff", "admin"];

const PROFILE_FIELDS = "id, full_name, phone, role, is_active, created_at";

const idParams = z.object({ id: z.uuid("That user id is not valid.") });

function badRequest(path, message) {
  return new ApiError(400, "Validation failed", [{ path, message }]);
}

function readPaging(query) {
  const page = Math.max(1, Math.floor(Number(query.page ?? 1)) || 1);
  const limit = Math.min(60, Math.max(1, Math.floor(Number(query.limit ?? 20)) || 20));
  return { page, limit };
}

/** Commas and parentheses would break the PostgREST `or` filter; % and _ are LIKE wildcards. */
function safePattern(value) {
  return value.replace(/[,()]/g, " ").replace(/[%_\\]/g, "\\$&");
}

async function withEmail(profile) {
  return { ...profile, email: await getUserEmail(profile.id) };
}

usersRouter.get("/", async (req, res) => {
  const { page, limit } = readPaging(req.query);

  let query = supabase().from("profiles").select(PROFILE_FIELDS, { count: "exact" });

  // Capped like the catalog search, so no query string can grow the filter without bound.
  const search = req.query.q ? String(req.query.q).trim().slice(0, 120) : "";
  if (search) {
    const pattern = safePattern(search);
    query = query.or(`full_name.ilike.%${pattern}%,phone.ilike.%${pattern}%`);
  }

  if (req.query.role) {
    const role = String(req.query.role);
    if (!ROLES.includes(role)) throw badRequest("role", `Use one of: ${ROLES.join(", ")}`);
    query = query.eq("role", role);
  }

  if (req.query.is_active) {
    const active = String(req.query.is_active);
    if (active !== "true" && active !== "false") {
      throw badRequest("is_active", "Use is_active=true or is_active=false.");
    }
    query = query.eq("is_active", active === "true");
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw new ApiError(500, "Could not load users");

  res.json({ data: await Promise.all((data ?? []).map(withEmail)), page, total: count ?? 0 });
});

usersRouter.patch(
  "/:id",
  validate({
    params: idParams,
    body: z
      .object({
        role: z.enum(ROLES).optional(),
        is_active: z.boolean().optional(),
      })
      .refine((body) => Object.keys(body).length > 0, {
        message: "Send at least one field to update.",
      }),
  }),
  async (req, res) => {
    const { id } = req.validated.params;
    const patch = req.validated.body;

    // Losing your own admin rights by accident is unrecoverable without the database.
    const demotingSelf = patch.role && patch.role !== req.user.role;
    if (id === req.user.id && (demotingSelf || patch.is_active === false)) {
      throw new ApiError(409, "You cannot change your own role or deactivate yourself.");
    }

    const { data: target, error: readError } = await supabase()
      .from("profiles")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (readError) throw new ApiError(500, "Could not load that user");
    if (!target) throw new ApiError(404, "User not found");

    const { data, error } = await supabase()
      .from("profiles")
      .update(patch)
      .eq("id", id)
      .select(PROFILE_FIELDS)
      .single();

    if (error) throw new ApiError(500, "Could not update that user");

    res.json({ data: await withEmail(data) });
  },
);
