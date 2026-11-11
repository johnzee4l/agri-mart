import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../lib/errors.js";
import { supabase } from "../lib/supabase.js";
import { auth, requireRole, validate } from "../middleware.js";
import { computeDeliveryFee, roundMoney } from "../lib/fee.js";
import { createPaymentIntent, paymongoConfigured } from "../lib/paymongo.js";
import { emitStock } from "../lib/realtime.js";
import { sendOrderConfirmation, sendOrderStatus } from "../lib/mailer.js";
import { notifyLowStock } from "../lib/lowStock.js";
import { getUserEmail } from "../lib/profile.js";
import { notifyNewOrder, notifyOrderStatus } from "../lib/pushEvents.js";

/* FR-5, FR-8, FR-9. Orders. Prices, stock, the delivery fee and item availability
   are all decided here, never from the request body (blueprint 6.4). */

export const ordersRouter = Router();

ordersRouter.use(auth);

const idParams = z.object({ id: z.uuid("That order id is not valid.") });

const ORDER_SELECT =
  "*, order_items(*, products(name, unit, image_url)), payments(method, status, paid_at)";

const STATUSES = ["pending", "paid", "preparing", "out_for_delivery", "completed", "cancelled"];

const TRANSITIONS = {
  pending: ["paid", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "completed", "cancelled"],
  out_for_delivery: ["completed"],
  completed: [],
  cancelled: [],
};

const ONLINE_METHODS = new Set(["gcash", "card", "grab_pay"]);

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

function isStaff(user) {
  return user?.role === "admin" || user?.role === "staff";
}

function readPaging(query) {
  const page = Math.max(1, Math.floor(Number(query.page ?? 1)) || 1);
  const limit = Math.min(60, Math.max(1, Math.floor(Number(query.limit ?? 20)) || 20));
  return { page, limit };
}

async function loadRates() {
  const { data, error } = await supabase()
    .from("site_content")
    .select("key, value")
    .in("key", ["store_location", "delivery_rates"]);

  if (error) throw new ApiError(500, "Could not load the delivery settings");

  const content = {};
  for (const row of data ?? []) content[row.key] = row.value;

  return { store: content.store_location ?? null, rates: content.delivery_rates ?? null };
}

async function ownAddress(userId, addressId) {
  const { data, error } = await supabase()
    .from("addresses")
    .select("id, latitude, longitude")
    .eq("id", addressId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new ApiError(500, "Could not load that address");
  if (!data) throw new ApiError(404, "Address not found");

  return data;
}

async function loadOrder(orderId, user) {
  let query = supabase().from("orders").select(ORDER_SELECT).eq("id", orderId);
  if (!isStaff(user)) query = query.eq("user_id", user.id);

  const { data, error } = await query.maybeSingle();
  if (error) throw new ApiError(500, "Could not load that order");
  if (!data) throw new ApiError(404, "Order not found");

  return data;
}

/** Calls the SQL function once; stock_deducted inside it makes that safe. */
async function deductStock(orderId) {
  const { data, error } = await supabase().rpc("deduct_stock", { order_id: orderId });
  if (error) throw new ApiError(409, error.message);
  return data ?? [];
}

/** After a deduction, send the new quantities to every open storefront tab. */
async function broadcastStock(orderId) {
  const { data: items } = await supabase()
    .from("order_items")
    .select("product_id")
    .eq("order_id", orderId);

  const ids = [...new Set((items ?? []).map((item) => item.product_id))];
  if (ids.length === 0) return;

  const { data: products } = await supabase()
    .from("products")
    .select("id, stock_qty")
    .in("id", ids);

  emitStock(products ?? []);
}

function assertTransition(order, next, method) {
  if (next === "preparing" && order.status === "pending") {
    if (method !== "cod") {
      throw new ApiError(409, "Online orders must be paid before preparing.");
    }
    return;
  }

  if (!TRANSITIONS[order.status]?.includes(next)) {
    throw new ApiError(409, `Cannot move an order from ${order.status} to ${next}.`);
  }

  if (next === "out_for_delivery" && order.fulfillment_type === "pickup") {
    throw new ApiError(400, "Pickup orders skip out for delivery.");
  }
}

ordersRouter.post(
  "/",
  validate({
    body: z.object({
      items: z
        .array(
          z.object({
            product_id: z.uuid("Choose a product."),
            qty: z.coerce.number().int("Use whole quantities.").min(1).max(999),
          }),
        )
        .min(1, "Add at least one item.")
        .max(50, "Split large orders into more than one."),
      fulfillment_type: z.enum(["delivery", "pickup"]),
      address_id: z.uuid("Choose a delivery address.").nullable().optional(),
      method: z.enum(["cod", "gcash", "card", "grab_pay"]),
    }),
  }),
  async (req, res) => {
    const { items, fulfillment_type, address_id, method } = req.validated.body;

    // Combine repeats so one line cannot slip past the stock check.
    const wanted = new Map();
    for (const item of items) {
      wanted.set(item.product_id, (wanted.get(item.product_id) ?? 0) + item.qty);
    }

    const productIds = [...wanted.keys()];
    const { data: products, error: productError } = await supabase()
      .from("products")
      .select("id, name, price, stock_qty, image_url, deleted_at")
      .in("id", productIds);

    if (productError) throw new ApiError(500, "Could not load the products");

    const byId = new Map((products ?? []).map((product) => [product.id, product]));
    const problems = [];

    for (const [index, productId] of productIds.entries()) {
      const product = byId.get(productId);
      if (!product) {
        problems.push({ path: `items.${index}.product_id`, message: "This product no longer exists." });
        continue;
      }
      if (product.deleted_at) {
        problems.push({ path: `items.${index}.product_id`, message: `${product.name} is no longer sold.` });
        continue;
      }
      const wantedQty = wanted.get(productId);
      if (wantedQty > Number(product.stock_qty)) {
        problems.push({
          path: `items.${index}.qty`,
          message: `Only ${product.stock_qty} of ${product.name} left.`,
        });
      }
    }

    if (problems.length > 0) throw new ApiError(400, "Validation failed", problems);

    const lines = productIds.map((productId) => {
      const product = byId.get(productId);
      const quantity = wanted.get(productId);
      const unitPrice = roundMoney(product.price);
      return {
        product_id: productId,
        name: product.name,
        quantity,
        unit_price: unitPrice,
        subtotal: roundMoney(unitPrice * quantity),
      };
    });

    const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.subtotal, 0));

    let address = null;
    let deliveryFee = 0;

    if (fulfillment_type === "delivery") {
      if (!address_id) {
        throw new ApiError(400, "Validation failed", [
          { path: "address_id", message: "Choose or add a delivery address." },
        ]);
      }

      address = await ownAddress(req.user.id, address_id);
      const { store, rates } = await loadRates();
      deliveryFee = computeDeliveryFee({
        store,
        destination: { latitude: address.latitude, longitude: address.longitude },
        rates,
      });
    }

    const total = roundMoney(subtotal + deliveryFee);

    // Fail before writing an order that could never be paid.
    if (ONLINE_METHODS.has(method) && !paymongoConfigured()) {
      throw new ApiError(503, "Online payment is not configured. Choose cash on delivery.");
    }

    // Intent first: a failed PayMongo call must not leave an orphan order behind.
    const intent = ONLINE_METHODS.has(method)
      ? await createPaymentIntent({
          amount: total,
          method,
          description: `AgriMart order (${lines.length} item${lines.length === 1 ? "" : "s"})`,
        })
      : null;

    const { data: order, error: orderError } = await supabase()
      .from("orders")
      .insert({
        user_id: req.user.id,
        address_id: fulfillment_type === "delivery" ? address_id : null,
        fulfillment_type,
        delivery_fee: deliveryFee,
        total_amount: total,
        status: "pending",
      })
      .select("*")
      .single();

    if (orderError) throw new ApiError(500, "Could not create the order");

    const { error: itemsError } = await supabase().from("order_items").insert(
      lines.map((line) => ({
        order_id: order.id,
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        subtotal: line.subtotal,
      })),
    );

    if (itemsError) {
      // Do not leave a half-written order behind.
      await supabase().from("orders").delete().eq("id", order.id);
      console.error("[orders] order_items insert failed:", itemsError.message);
      throw new ApiError(500, "Could not save the order items");
    }

    const { error: paymentError } = await supabase().from("payments").insert({
      order_id: order.id,
      method,
      paymongo_ref: intent?.id ?? null,
      amount: total,
      status: "pending",
    });

    if (paymentError) {
      await supabase().from("orders").delete().eq("id", order.id);
      console.error("[orders] payments insert failed:", paymentError.message);
      throw new ApiError(500, "Could not save the payment");
    }

    sendOrderConfirmation({
      to: req.user.email,
      order,
      items: lines,
    }).catch(() => false);

    // The counter hears about a new order without refreshing its list.
    notifyNewOrder({
      order,
      method,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    }).catch(() => 0);

    res.status(201).json({
      order: { ...order, order_items: lines.map(({ name, ...line }) => ({ ...line, products: { name } })) },
      payment: intent ? { intent_id: intent.id, client_key: intent.clientKey } : null,
    });
  },
);

ordersRouter.get("/", validate({ query: rangeQuery }), async (req, res) => {
  const { page, limit } = readPaging(req.query);
  const status = req.query.status ? String(req.query.status) : null;

  if (status && !STATUSES.includes(status)) {
    throw new ApiError(400, "Validation failed", [
      { path: "status", message: `Use one of: ${STATUSES.join(", ")}` },
    ]);
  }

  let query = supabase().from("orders").select("*, payments(method, status)", { count: "exact" });
  if (!isStaff(req.user)) query = query.eq("user_id", req.user.id);

  if (status) query = query.eq("status", status);
  if (req.query.from) query = query.gte("created_at", String(req.query.from));
  if (req.query.to) query = query.lte("created_at", String(req.query.to));

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw new ApiError(500, "Could not load orders");

  res.json({ data: data ?? [], page, total: count ?? 0 });
});

ordersRouter.get("/:id", validate({ params: idParams }), async (req, res) => {
  const order = await loadOrder(req.validated.params.id, req.user);
  res.json({ data: order });
});

ordersRouter.post("/:id/cancel", validate({ params: idParams }), async (req, res) => {
  const order = await loadOrder(req.validated.params.id, req.user);

  if (order.status !== "pending") {
    throw new ApiError(409, "Only a pending order can be cancelled.");
  }

  const { data: updated, error } = await supabase()
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw new ApiError(500, "Could not cancel that order");
  if (!updated) throw new ApiError(409, "That order changed while you were cancelling it.");

  // No money moved for a pending order; reflect that on the payment row.
  await supabase()
    .from("payments")
    .update({ status: "failed" })
    .eq("order_id", order.id)
    .eq("status", "pending");

  res.json({ data: updated });
});

ordersRouter.patch(
  "/:id/status",
  requireRole("admin", "staff"),
  validate({
    params: idParams,
    body: z.object({ status: z.enum(STATUSES) }),
  }),
  async (req, res) => {
    const next = req.validated.body.status;

    let query = supabase()
      .from("orders")
      .select("*, payments(method, status)")
      .eq("id", req.validated.params.id);

    const { data: order, error } = await query.maybeSingle();
    if (error) throw new ApiError(500, "Could not load that order");
    if (!order) throw new ApiError(404, "Order not found");

    const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;
    assertTransition(order, next, payment?.method);

    let deducted = false;
    if (next === "preparing" && payment?.method === "cod" && !order.stock_deducted) {
      const low = await deductStock(order.id);
      deducted = true;
      notifyLowStock(low).catch(() => 0);
    }

    const { error: updateError } = await supabase()
      .from("orders")
      .update({ status: next })
      .eq("id", order.id)
      .eq("status", order.status);

    if (updateError) throw new ApiError(500, "Could not change the order status");

    // COD is paid on completion; online payments are paid by the webhook.
    if (next === "completed" && payment?.method === "cod") {
      await supabase()
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("order_id", order.id);
    }

    if (deducted) await broadcastStock(order.id);

    const updated = await loadOrder(order.id, req.user);

    // Order status changed → the customer (blueprint 6.2).
    notifyOrderStatus(updated).catch(() => 0);

    getUserEmail(updated.user_id)
      .then((email) => sendOrderStatus({ to: email, order: updated }))
      .catch(() => false);

    res.json({ data: updated });
  },
);
