import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../lib/errors.js";
import { supabase } from "../lib/supabase.js";
import { crudRouter, patchOf } from "../lib/crud.js";

/* FR-1, FR-2, FR-3, FR-23. Products and categories on top of lib/crud.js, with the
   search, filter, sort and pagination contract from docs/api.md. */

export const catalogRouter = Router();

const optionalText = (max) => z.string().trim().max(max).nullable().optional();

const productBody = z.object({
  name: z.string().trim().min(1, "Enter the product name.").max(160),
  description: optionalText(2000),
  category_id: z.uuid("Choose a category.").nullable().optional(),
  brand: optionalText(120),
  unit: optionalText(40),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  stock_qty: z.coerce.number().int("Use a whole number.").min(0, "Stock cannot be negative."),
  reorder_level: z.coerce.number().int("Use a whole number.").min(0).optional(),
  image_url: optionalText(500),
  is_featured: z.boolean().optional(),
});

const categoryBody = z.object({
  name: z.string().trim().min(1, "Enter the category name.").max(80),
  description: optionalText(500),
});

const productFilters = {
  category: { column: "category_id", op: "eq" },
  brand: { column: "brand", op: "ilike" },
  minPrice: { column: "price", op: "gte", numeric: true },
  maxPrice: { column: "price", op: "lte", numeric: true },
};

/* Sort values used by the storefront: "" is the default (newest first). */
const productSort = {
  newest: { column: "created_at", ascending: false },
  price_asc: { column: "price", ascending: true },
  price_desc: { column: "price", ascending: false },
  name: { column: "name", ascending: true },
};

/* Blueprint 5.4: permanent delete is blocked while order history references the row. */
async function guardProductPurge(row) {
  const { count, error } = await supabase()
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", row.id);

  if (error) throw new ApiError(500, "Could not check order history");
  if ((count ?? 0) > 0) {
    throw new ApiError(409, "This product appears in order history. Archive it instead of purging.");
  }
}

async function guardCategoryPurge(row) {
  const { count, error } = await supabase()
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", row.id);

  if (error) throw new ApiError(500, "Could not check products in this category");
  if ((count ?? 0) > 0) {
    throw new ApiError(409, "Products still use this category. Move them first.");
  }
}

catalogRouter.use(
  "/products",
  crudRouter({
    table: "products",
    createSchema: productBody,
    updateSchema: patchOf(productBody),
    searchColumns: ["name", "brand", "description"],
    filters: productFilters,
    sortable: productSort,
    purgeGuard: guardProductPurge,
  }),
);

catalogRouter.use(
  "/categories",
  crudRouter({
    table: "categories",
    createSchema: categoryBody,
    updateSchema: patchOf(categoryBody),
    searchColumns: ["name", "description"],
    defaultSort: [{ column: "name", ascending: true }],
    purgeGuard: guardCategoryPurge,
  }),
);
