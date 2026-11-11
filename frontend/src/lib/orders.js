/* Order status vocabulary (blueprint 5.2) and response normalizers.
   Pickup orders skip out_for_delivery. */

export const ORDER_STATUSES = {
  pending: { label: "Pending", tone: "bg-accent-subtle text-accent-text" },
  paid: { label: "Paid", tone: "bg-primary-subtle text-primary-text" },
  preparing: { label: "Preparing", tone: "bg-muted text-fg" },
  out_for_delivery: { label: "Out for delivery", tone: "bg-primary-subtle text-primary-text" },
  completed: { label: "Completed", tone: "bg-primary text-on-primary" },
  cancelled: { label: "Cancelled", tone: "bg-danger-subtle text-danger-text" },
};

export const ORDER_FLOW = ["pending", "paid", "preparing", "out_for_delivery", "completed"];

export const PICKUP_FLOW = ["pending", "paid", "preparing", "completed"];

export const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on delivery", note: "Pay the rider or at the counter." },
  { value: "gcash", label: "GCash", note: "Pay in the GCash app, then return here." },
  { value: "card", label: "Card", note: "Visa or Mastercard, processed by PayMongo." },
  { value: "grab_pay", label: "GrabPay", note: "Pay in the GrabPay app, then return here." },
];

export function readOrder(payload) {
  if (!payload) return null;
  return payload.order ?? payload.data?.order ?? payload.data ?? payload;
}

/* POST /orders is not shaped in docs/api.md yet. Assumed:
   { order, payment: { intent_id, client_key } }, optionally wrapped in data. */
export function readOrderCreation(payload) {
  const root = payload?.data ?? payload ?? {};
  const payment = root.payment ?? {};
  return {
    order: root.order ?? root,
    intentId: payment.intent_id ?? root.payment_intent_id ?? null,
    clientKey: payment.client_key ?? root.client_key ?? null,
  };
}

export function readOrderItems(order) {
  if (Array.isArray(order?.order_items)) return order.order_items;
  if (Array.isArray(order?.items)) return order.items;
  return [];
}
