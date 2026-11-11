import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../lib/errors.js";
import { supabase } from "../lib/supabase.js";
import { getProfile } from "../lib/profile.js";
import { auth, validate } from "../middleware.js";

/* FR-15, FR-23. The signed-in customer's own profile and addresses. Every query is
   scoped by req.user.id; an address that belongs to someone else is a 404, never a
   403 that confirms it exists. DELETE archives through deleted_at. */

export const meRouter = Router();

meRouter.use(auth);

const ADDRESS_FIELDS =
  "id, street, barangay, municipality, province, latitude, longitude, is_default, created_at";

const textField = (max, message) => z.string().trim().min(1, message).max(max);

const addressBody = z.object({
  street: textField(160, "Enter the street or purok."),
  barangay: textField(120, "Enter the barangay."),
  municipality: textField(120, "Enter the municipality or city."),
  province: textField(120, "Enter the province."),
  latitude: z.number().min(-90, "Latitude is out of range.").max(90).nullable().optional(),
  longitude: z.number().min(-180, "Longitude is out of range.").max(180).nullable().optional(),
  is_default: z.boolean().optional(),
});

const idParams = z.object({ id: z.uuid("That address id is not valid.") });

function profileResponse(profile, email) {
  return { ...profile, email: email ?? profile.email ?? null };
}

/** Loads an address only when it is the caller's and still active. */
async function ownAddress(userId, id) {
  const { data, error } = await supabase()
    .from("addresses")
    .select("id, is_default")
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new ApiError(500, "Could not load that address");
  if (!data) throw new ApiError(404, "Address not found");

  return data;
}

/** Only one default address per customer. */
async function clearOtherDefaults(userId, keepId = null) {
  let query = supabase()
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true)
    .is("deleted_at", null);

  if (keepId) query = query.neq("id", keepId);

  const { error } = await query;
  if (error) throw new ApiError(500, "Could not update the default address");
}

meRouter.get("/", async (req, res) => {
  const profile = await getProfile(req.user.id);
  res.json({ data: profileResponse(profile, req.user.email) });
});

meRouter.patch(
  "/",
  validate({
    body: z
      .object({
        full_name: z.string().trim().min(2, "Enter your full name.").max(120).optional(),
        phone: z.string().trim().max(20, "Use at most 20 characters.").nullable().optional(),
      })
      .refine((body) => Object.keys(body).length > 0, {
        message: "Send at least one field to update.",
      }),
  }),
  async (req, res) => {
    const { full_name, phone } = req.validated.body;

    const patch = {};
    if (full_name !== undefined) patch.full_name = full_name;
    if (phone !== undefined) patch.phone = phone ? phone : null;

    const { data, error } = await supabase()
      .from("profiles")
      .update(patch)
      .eq("id", req.user.id)
      .select("*")
      .single();

    if (error) throw new ApiError(500, "Could not save your profile");

    res.json({ data: profileResponse(data, req.user.email) });
  },
);

meRouter.get("/addresses", async (req, res) => {
  const { data, error } = await supabase()
    .from("addresses")
    .select(ADDRESS_FIELDS)
    .eq("user_id", req.user.id)
    .is("deleted_at", null)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new ApiError(500, "Could not load your addresses");

  // Documented list shape: { data, page, total }.
  const rows = data ?? [];
  res.json({ data: rows, page: 1, total: rows.length });
});

meRouter.post(
  "/addresses",
  validate({ body: addressBody }),
  async (req, res) => {
    const body = req.validated.body;

    const { count, error: countError } = await supabase()
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", req.user.id)
      .is("deleted_at", null);

    if (countError) throw new ApiError(500, "Could not read your addresses");

    // The first address becomes the default automatically (Account and Checkout
    // both rely on one existing before the customer chooses).
    const makeDefault = body.is_default ?? (count ?? 0) === 0;
    if (makeDefault) await clearOtherDefaults(req.user.id);

    const { data, error } = await supabase()
      .from("addresses")
      .insert({
        user_id: req.user.id,
        street: body.street,
        barangay: body.barangay,
        municipality: body.municipality,
        province: body.province,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        is_default: makeDefault,
      })
      .select(ADDRESS_FIELDS)
      .single();

    if (error) throw new ApiError(400, error.message);

    res.status(201).json({ data });
  },
);

meRouter.patch(
  "/addresses/:id",
  validate({
    params: idParams,
    body: addressBody
      .partial()
      .refine((body) => Object.keys(body).length > 0, {
        message: "Send at least one field to update.",
      }),
  }),
  async (req, res) => {
    const { id } = req.validated.params;
    const body = req.validated.body;

    await ownAddress(req.user.id, id);

    if (body.is_default === true) await clearOtherDefaults(req.user.id, id);

    const patch = {};
    for (const field of ["street", "barangay", "municipality", "province", "latitude", "longitude"]) {
      if (body[field] !== undefined) patch[field] = body[field];
    }
    if (body.is_default !== undefined) patch.is_default = body.is_default;

    const { data, error } = await supabase()
      .from("addresses")
      .update(patch)
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select(ADDRESS_FIELDS)
      .single();

    if (error) throw new ApiError(400, error.message);

    res.json({ data });
  },
);

meRouter.delete(
  "/addresses/:id",
  validate({ params: idParams }),
  async (req, res) => {
    const { id } = req.validated.params;

    const existing = await ownAddress(req.user.id, id);

    const { error } = await supabase()
      .from("addresses")
      .update({ deleted_at: new Date().toISOString(), is_default: false })
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) throw new ApiError(500, "Could not archive that address");

    // Do not leave the customer without a default after archiving it.
    if (existing.is_default) {
      const { data: next } = await supabase()
        .from("addresses")
        .select("id")
        .eq("user_id", req.user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (next?.length) {
        await supabase().from("addresses").update({ is_default: true }).eq("id", next[0].id);
      }
    }

    res.status(204).end();
  },
);
