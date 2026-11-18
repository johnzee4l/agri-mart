/* Catalog helpers shared by the storefront pages. */

import { api } from "./api.js";
import { asList } from "./format.js";

export const PAGE_SIZE = 12;

const MAX_PAGES = 50;

/** Every active product, page by page, for admin pickers that must not stop at 60. */
export async function fetchAllProducts() {
  const all = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await api.get(`/products?limit=60&page=${page}`);
    const rows = asList(payload);
    all.push(...rows);

    if (rows.length < 60) break;
    if (Number(payload?.total) > 0 && all.length >= Number(payload.total)) break;
  }

  return all;
}

// Values match the sort parameter in docs/api.md.
export const SORT_OPTIONS = [
  { value: "", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];

/** FR-1. Out of stock, low (at or below reorder level) or in stock. */
export function stockStatus(product) {
  const quantity = Number(product?.stock_qty ?? 0);
  const reorder = Number(product?.reorder_level ?? 0);
  if (quantity <= 0) return "out";
  if (reorder > 0 && quantity <= reorder) return "low";
  return "in";
}

/** Builds the GET /products path from the URL search params. */
export function buildProductsQuery(params) {
  const query = new URLSearchParams();

  ["q", "category", "brand", "minPrice", "maxPrice", "sort"].forEach((key) => {
    const value = params.get(key);
    if (value) query.set(key, value);
  });

  const page = Number(params.get("page") ?? 1);
  query.set("page", String(Number.isFinite(page) && page > 0 ? Math.floor(page) : 1));
  query.set("limit", String(PAGE_SIZE));

  return `/products?${query.toString()}`;
}
