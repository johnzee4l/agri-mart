import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../lib/errors.js";
import { supabase } from "../lib/supabase.js";
import { auth, requireRole, validate } from "../middleware.js";

/* FR-17. site_content is a key/value store (blueprint 5.2). The storefront reads
   every key at once as a map, which is the shape lib/content.js consumes; the admin
   panel writes one key at a time. */

export const contentRouter = Router();

const CONTENT_KEYS = new Set([
  "home_hero",
  "home_banners",
  "about",
  "contact",
  "store_location",
  "delivery_rates",
]);

const keyParams = z.object({ key: z.string().trim().regex(/^[a-z0-9_]+$/, "Unknown content key.") });

contentRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase().from("site_content").select("key, value, updated_at");
  if (error) throw new ApiError(500, "Could not load site content");

  const content = {};
  for (const row of data ?? []) content[row.key] = row.value;

  res.json({ data: content });
});

contentRouter.put(
  "/:key",
  auth,
  requireRole("admin"),
  validate({ params: keyParams, body: z.object({ value: z.unknown() }) }),
  async (req, res) => {
    const { key } = req.validated.params;

    // Fixed key list: a typo must not quietly create a key nothing reads.
    if (!CONTENT_KEYS.has(key)) throw new ApiError(404, "Unknown content key");

    const { value } = req.validated.body;
    if (value === undefined) throw new ApiError(400, "Send a value for the key.");

    const { data, error } = await supabase()
      .from("site_content")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
      .select("key, value, updated_at")
      .single();

    if (error) throw new ApiError(400, error.message);

    res.json({ data });
  },
);
