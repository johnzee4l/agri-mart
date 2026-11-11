import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";

import { ApiError } from "../lib/errors.js";
import { supabase } from "../lib/supabase.js";
import { emitStock } from "../lib/realtime.js";
import { sendOrderStatus } from "../lib/mailer.js";
import { getUserEmail } from "../lib/profile.js";

/* FR-9. PayMongo webhook. The signature is an HMAC-SHA256 of "timestamp.rawBody"
   with the endpoint secret, sent in the Paymongo-Signature header as t, te (test)
   and li (live). Duplicate deliveries and the stock_deducted flag keep the deduction
   to exactly one. */

export const paymentsRouter = Router();

/** Parses "t=...,te=...,li=..." into its parts. */
export function parseSignatureHeader(header) {
  return String(header ?? "")
    .split(",")
    .reduce((parts, part) => {
      const index = part.indexOf("=");
      if (index > 0) parts[part.slice(0, index).trim()] = part.slice(index + 1).trim();
      return parts;
    }, {});
}

export function verifyWebhookSignature({ rawBody, header, secret }) {
  const { t, te, li } = parseSignatureHeader(header);
  const provided = te || li;

  if (!t || !provided || !secret) return false;

  const expected = createHmac("sha256", secret)
    .update(t)
    .update(".")
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

paymentsRouter.post("/webhook", async (req, res) => {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret) throw new ApiError(503, "The webhook secret is not configured");

  const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
  if (!verifyWebhookSignature({ rawBody, header: req.headers["paymongo-signature"], secret })) {
    throw new ApiError(401, "Invalid webhook signature");
  }

  const eventType = req.body?.data?.attributes?.type ?? "";
  const resource = req.body?.data?.attributes?.data;

  if (resource?.type !== "payment") {
    return res.json({ received: true, ignored: eventType || "unknown" });
  }

  const intentId = resource.attributes?.payment_intent_id ?? null;
  if (!intentId) return res.json({ received: true, ignored: "missing payment_intent_id" });

  const { data: payment, error } = await supabase()
    .from("payments")
    .select("id, order_id, status")
    .eq("paymongo_ref", intentId)
    .maybeSingle();

  if (error) throw new ApiError(500, "Could not load the payment");
  if (!payment) return res.json({ received: true, ignored: "unknown payment" });

  // PayMongo retries; a paid payment is already settled.
  if (payment.status === "paid") return res.json({ received: true, duplicate: true });

  const succeeded = eventType === "payment.paid" || resource.attributes?.status === "paid";

  if (!succeeded) {
    await supabase()
      .from("payments")
      .update({ status: "failed" })
      .eq("id", payment.id)
      .eq("status", "pending");
    return res.json({ received: true, status: "failed" });
  }

  const { error: paidError } = await supabase()
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", payment.id)
    .eq("status", "pending");

  if (paidError) throw new ApiError(500, "Could not mark the payment paid");

  await supabase()
    .from("orders")
    .update({ status: "paid" })
    .eq("id", payment.order_id)
    .eq("status", "pending");

  const { error: stockError } = await supabase().rpc("deduct_stock", {
    order_id: payment.order_id,
  });

  if (stockError) throw new ApiError(500, "Could not deduct stock");

  const { data: items } = await supabase()
    .from("order_items")
    .select("product_id")
    .eq("order_id", payment.order_id);

  const productIds = [...new Set((items ?? []).map((item) => item.product_id))];
  if (productIds.length > 0) {
    const { data: products } = await supabase()
      .from("products")
      .select("id, stock_qty")
      .in("id", productIds);
    emitStock(products ?? []);
  }

  const { data: order } = await supabase()
    .from("orders")
    .select("*")
    .eq("id", payment.order_id)
    .maybeSingle();

  if (order) {
    getUserEmail(order.user_id)
      .then((email) => sendOrderStatus({ to: email, order }))
      .catch(() => false);
  }

  res.json({ received: true, status: "paid" });
});
