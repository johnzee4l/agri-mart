import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../lib/errors.js";
import { supabase } from "../lib/supabase.js";
import { auth, requireRole, validate } from "../middleware.js";
import { emitStock } from "../lib/realtime.js";
import { notifyLowStock } from "../lib/lowStock.js";

/* FR-10, FR-11. The inventory log, the live low-stock list and the adjustments
   (stock-in, adjustment and spoilage) behind the admin Inventory page. Staff and
   admin only: the log names the person who moved the stock. */

export const inventoryRouter = Router();

inventoryRouter.use(auth, requireRole("admin", "staff"));

const REASONS = ["stock-in", "sale", "adjustment", "spoilage"];
const ADJUSTABLE = ["stock-in", "adjustment", "spoilage"];

const LOG_SELECT =
  "id, product_id, user_id, change_qty, reason, created_at, products(name, unit, image_url)";

function readPaging(query) {
  const page = Math.max(1, Math.floor(Number(query.page ?? 1)) || 1);
  const limit = Math.min(60, Math.max(1, Math.floor(Number(query.limit ?? 20)) || 20));
  return { page, limit };
}

function badRequest(path, message) {
  return new ApiError(400, "Validation failed", [{ path, message }]);
}

/* `from`/`to` go straight into the PostgREST filter, so a malformed date has to be a
   400 here instead of a database error that reads like a server fault. */
const dateParam = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Use an ISO date, for example 2026-11-01.",
  })
  .optional();

const rangeQuery = z.object({ from: dateParam, to: dateParam });

inventoryRouter.get("/logs", validate({ query: rangeQuery }), async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const reason = req.query.reason ? String(req.query.reason) : null;

  if (reason && !REASONS.includes(reason)) {
    throw badRequest("reason", `Use one of: ${REASONS.join(", ")}`);
  }

  let query = supabase().from("inventory_logs").select(LOG_SELECT, { count: "exact" });

  if (req.query.product_id) {
    const productId = z.uuid().safeParse(String(req.query.product_id));
    if (!productId.success) throw badRequest("product_id", "That product id is not valid.");
    query = query.eq("product_id", productId.data);
  }

  if (reason) query = query.eq("reason", reason);
  if (req.query.from) query = query.gte("created_at", String(req.query.from));
  if (req.query.to) query = query.lte("created_at", String(req.query.to));

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw new ApiError(500, "Could not load the inventory log");

  res.json({ data: data ?? [], page, total: count ?? 0 });
});

inventoryRouter.get("/low-stock", async (_req, res) => {
  // Column-to-column comparison lives in SQL; PostgREST filters only take literals.
  const { data, error } = await supabase().rpc("low_stock_products");

  if (error) throw new ApiError(500, "Could not load the low-stock list");

  res.json({ data: data ?? [] });
});

inventoryRouter.post(
  "/adjust",
  validate({
    body: z.object({
      product_id: z.uuid("Choose a product."),
      change_qty: z.coerce.number().int("Use a whole number."),
      reason: z.enum(ADJUSTABLE),
    }),
  }),
  async (req, res) => {
    const { product_id, change_qty, reason } = req.validated.body;

    if (change_qty === 0) throw badRequest("change_qty", "Change the stock by at least one unit.");
    if (reason === "stock-in" && change_qty < 0) {
      throw badRequest("change_qty", "Stock-in has to add stock.");
    }
    if (reason === "spoilage" && change_qty > 0) {
      throw badRequest("change_qty", "Spoilage has to remove stock.");
    }

    const { data: product, error: productError } = await supabase()
      .from("products")
      .select("id, deleted_at")
      .eq("id", product_id)
      .maybeSingle();

    if (productError) throw new ApiError(500, "Could not load that product");
    if (!product) throw new ApiError(404, "Product not found");
    if (product.deleted_at) throw new ApiError(409, "Archived products cannot be adjusted.");

    // One transaction in SQL: stock, the log row, and whether it is now low.
    const { data: low, error: rpcError } = await supabase().rpc("adjust_stock", {
      product_id,
      change_qty,
      reason,
      user_id: req.user.id,
    });

    if (rpcError) {
      if (/stock_qty|check constraint|negative/i.test(rpcError.message)) {
        throw new ApiError(409, "That would take the stock below zero.");
      }
      throw new ApiError(500, "Could not adjust the stock");
    }

    const { data: updated, error: readError } = await supabase()
      .from("products")
      .select("*")
      .eq("id", product_id)
      .single();

    if (readError) throw new ApiError(500, "Could not load the updated product");

    emitStock([updated]);

    // Best effort: the adjustment is already saved.
    notifyLowStock(low ? [updated] : []).catch(() => 0);

    res.status(201).json({ data: updated, low_stock: Boolean(low) });
  },
);
