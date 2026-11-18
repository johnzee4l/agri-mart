import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../lib/errors.js";
import { supabase } from "../lib/supabase.js";
import { auth, requireRole, validate } from "../middleware.js";
import { roundMoney } from "../lib/fee.js";
import { createPaymentIntent, paymongoConfigured } from "../lib/paymongo.js";
import { emitStock } from "../lib/realtime.js";
import { sendOrderConfirmation, sendOrderStatus } from "../lib/mailer.js";
import { notifyLowStock } from "../lib/lowStock.js";
import { getUserEmail, withUserProfiles } from "../lib/profile.js";
import { notifyNewOrder, notifyOrderStatus } from "../lib/pushEvents.js";

/* FR-5, FR-8, FR-9. Orders. Prices, stock and item availability are all decided here,
   never from the request body (blueprint 6.4). The store is pickup only: no address and
   no delivery fee, and a delivery request is refused rather than silently downgraded. */

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

/* A paid order is the point where stock is committed. The webhook settles online
   payments; COD settles when the counter confirms it. */
const DEDUCTED_STATUSES = new Set(["paid", "preparing", "out_for_delivery", "completed"]);

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

async function loadOrder(orderId, user) {
  let query = supabase().from("orders").select(ORDER_SELECT).eq("id", orderId);
  if (!isStaff(user)) query = query.eq("user_id", user.id);

  const { data, error } = await query.maybeSingle();
  if (error) throw new ApiError(500, "Could not load that order");
  if (!data) throw new ApiError(404, "Order not found");

  const [order] = await withUserProfiles([data]);
  return order;
}

/** Calls the SQL function once; stock_deducted inside it makes that safe. */
async function deductStock(orderId) {
  const { data, error } = await supabase().rpc("deduct_stock", { order_id: orderId });
  if (error) throw new ApiError(409, error.message);
  return data ?? [];
}

/** Returns every line to the shelf once, for a cancellation after stock moved. */
async function restockOrder(orderId) {
  const { data, error } = await supabase().rpc("restock_order", { order_id: orderId });
  if (error) throw new ApiError(500, "Could not return the stock to the shelf");
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

function assertTransition(order, next, payment) {
  if (next === "preparing" && order.status === "pending") {
    if (payment?.method !== "cod") {
      throw new ApiError(409, "Online orders must be paid before preparing.");
    }
    return;
  }

  if (!TRANSITIONS[order.status]?.includes(next)) {
    throw new ApiError(409, `Cannot move an order from ${order.status} to ${next}.`);
  }

  /* `paid` is a payment fact, never a manual shortcut. A webhook normally writes it;
     this only lets staff recover an order whose payment row is already settled. */
  if (next === "paid" && payment?.status !== "paid") {
    throw new ApiError(409, "That payment has not been confirmed yet.");
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
      fulfillment_type: z.enum(["delivery", "pickup"]).optional(),
      method: z.enum(["cod", "gcash", "card", "grab_pay"]),
    }),
  }),
  async (req, res) => {
    const { items, fulfillment_type = "pickup", method } = req.validated.body;

    if (fulfillment_type !== "pickup") {
      throw new ApiError(400, "The store only offers store pickup.");
    }

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

    const total = subtotal;

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
        address_id: null,
        fulfillment_type: "pickup",
        delivery_fee: 0,
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

  let query = supabase()
    .from("orders")
    .select("*, payments(method, status), order_items(quantity, products(name))", { count: "exact" });
  if (!isStaff(req.user)) query = query.eq("user_id", req.user.id);

  if (status) query = query.eq("status", status);
  if (req.query.from) query = query.gte("created_at", String(req.query.from));

  /* A bare date includes the whole day: compare against the next midnight instead
     of dropping every order placed after 00:00 that day. */
  if (req.query.to) {
    const raw = String(req.query.to);
    const nextDay = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000
      : null;

    query =
      nextDay === null
        ? query.lte("created_at", raw)
        : query.lt("created_at", new Date(nextDay).toISOString());
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw new ApiError(500, "Could not load orders");

  res.json({ data: await withUserProfiles(data), page, total: count ?? 0 });
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

  /* A pending order normally has no stock movement, but a retried payment can leave
     one deducted. Returning it keeps the catalog honest. */
  if (order.stock_deducted) {
    try {
      const returned = await restockOrder(order.id);
      if (returned.length > 0) broadcastStock(order.id);
    } catch (restockError) {
      console.error("[orders] restock after cancel failed:", restockError.message);
    }
  }

  res.json({ data: updated });
});

/* A failed or interrupted online payment leaves the order pending. This makes a
   fresh PayMongo intent for that same order, so retrying never duplicates the
   basket. Prices and items stay exactly as they were at checkout. */
ordersRouter.post("/:id/pay", validate({ params: idParams }), async (req, res) => {
  const order = await loadOrder(req.validated.params.id, req.user);
  const payment = Array.isArray(order.payments) ? order.payments[0] : order.payments;

  if (order.status !== "pending") {
    throw new ApiError(409, "Only a pending order can be paid.");
  }
  if (!payment) throw new ApiError(404, "This order has no payment record.");
  if (!ONLINE_METHODS.has(payment.method)) {
    throw new ApiError(400, "Cash orders are paid on delivery or at the counter.");
  }
  if (payment.status === "paid") throw new ApiError(409, "This order is already paid.");
  if (!paymongoConfigured()) throw new ApiError(503, "Online payment is not configured.");

  /* Prices are locked, but stock may have sold out while the payment was failing. */
  const lines = Array.isArray(order.order_items) ? order.order_items : [];
  const productIds = [...new Set(lines.map((line) => line.product_id))];
  const { data: products, error: productError } = await supabase()
    .from("products")
    .select("id, name, stock_qty, deleted_at")
    .in("id", productIds);

  if (productError) throw new ApiError(500, "Could not check the stock");

  const byId = new Map((products ?? []).map((product) => [product.id, product]));

  for (const line of lines) {
    const product = byId.get(line.product_id);
    if (!product || product.deleted_at) {
      throw new ApiError(409, "An item in this order is no longer sold. Please cancel and order again.");
    }
    if (Number(line.quantity) > Number(product.stock_qty)) {
      throw new ApiError(
        409,
        `Only ${product.stock_qty} of ${product.name} left. Cancel this order and place a new one.`,
      );
    }
  }

  const intent = await createPaymentIntent({
    amount: order.total_amount,
    method: payment.method,
    description: `AgriMart order (${lines.length} item${lines.length === 1 ? "" : "s"})`,
  });

  const { data: updated, error } = await supabase()
    .from("payments")
    .update({ paymongo_ref: intent.id, status: "pending" })
    .eq("order_id", order.id)
    .in("status", ["pending", "failed"])
    .select("id")
    .maybeSingle();

  if (error) throw new ApiError(500, "Could not start the payment");
  if (!updated) throw new ApiError(409, "That payment is already settled.");

  res.json({
    data: {
      intent_id: intent.id,
      client_key: intent.clientKey,
      method: payment.method,
      amount: order.total_amount,
    },
  });
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
    assertTransition(order, next, payment);

    /* Stock follows the money: online orders at `paid`, COD when the counter confirms
       (`pending → preparing`). `deduct_stock` is idempotent through stock_deducted. */
    const shouldDeduct =
      !order.stock_deducted &&
      DEDUCTED_STATUSES.has(next) &&
      (payment?.status === "paid" || (next === "preparing" && payment?.method === "cod"));

    let deducted = false;
    if (shouldDeduct) {
      const low = await deductStock(order.id);
      deducted = true;
      notifyLowStock(low).catch(() => 0);
    }

    const { data: changed, error: updateError } = await supabase()
      .from("orders")
      .update({ status: next })
      .eq("id", order.id)
      .eq("status", order.status)
      .select("id")
      .maybeSingle();

    if (updateError || !changed) {
      // The state moved underneath us (another staff tab or the webhook won). Undo the
      // deduction so a refused transition cannot quietly remove stock.
      if (deducted) {
        try {
          await restockOrder(order.id);
          await broadcastStock(order.id);
        } catch (undoError) {
          console.error("[orders] could not undo the stock deduction:", undoError.message);
        }
      }
      throw updateError
        ? new ApiError(500, "Could not change the order status")
        : new ApiError(409, "That order changed while you were updating it.");
    }

    // COD is paid on completion; online payments are paid by the webhook.
    if (next === "completed" && payment?.method === "cod") {
      await supabase()
        .from("payments")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("order_id", order.id);
    }

    if (next === "cancelled") {
      if (payment?.status === "pending") {
        await supabase()
          .from("payments")
          .update({ status: "failed" })
          .eq("order_id", order.id)
          .eq("status", "pending");
      }

      // A paid or packed order already took its stock; cancellation puts it back.
      if (order.stock_deducted) {
        try {
          await restockOrder(order.id);
          await broadcastStock(order.id);
        } catch (restockError) {
          console.error("[orders] restock after cancellation failed:", restockError.message);
        }
      }
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
