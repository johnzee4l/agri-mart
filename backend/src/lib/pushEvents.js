import { sendPushToRoles, sendPushToUser } from "./push.js";

/* FR-21, blueprint 6.2. The business events that become a push notification:

     order status changed  → the customer
     new order placed/paid → staff and admins
     new announcement      → subscribed customers
     low stock             → admins

   Every helper here is fired by the route that caused the event and is never awaited
   before the response, because push is a convenience: a slow or dead push service must
   not make a successful order, adjustment or announcement look like a failure. The
   payload shape is what frontend/src/sw.js reads: { title, body, url, tag }.

   Chat push (message while the recipient is offline) is Member 3's, from chat.js. */

const STATUS_LABELS = {
  pending: "waiting for confirmation",
  paid: "paid",
  preparing: "being prepared",
  out_for_delivery: "out for delivery",
  completed: "completed",
  cancelled: "cancelled",
};

const METHOD_LABELS = {
  cod: "cash on delivery",
  gcash: "GCash",
  card: "card",
  grab_pay: "GrabPay",
};

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

/** Short, human-friendly reference; the order id itself is a UUID. */
function reference(orderId) {
  return `#${String(orderId).slice(0, 8).toUpperCase()}`;
}

function money(amount) {
  return peso.format(Number(amount) || 0);
}

function sentences(text, limit = 140) {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit - 1).trimEnd()}…` : flat;
}

/** Order status changed → the customer (blueprint 6.2). */
export async function notifyOrderStatus(order) {
  return sendPushToUser(order.user_id, {
    title: `Order ${reference(order.id)}`,
    body: `Your order is now ${STATUS_LABELS[order.status] ?? order.status}. Tap to track it.`,
    url: `/orders/${order.id}`,
    tag: `order-${order.id}`,
  });
}

/** New order placed → staff and admins, so the counter sees it without refreshing. */
export async function notifyNewOrder({ order, method, itemCount }) {
  return sendPushToRoles(["admin", "staff"], {
    title: "New order",
    body: `${reference(order.id)} · ${money(order.total_amount)} · ${itemCount} item${
      itemCount === 1 ? "" : "s"
    } · ${METHOD_LABELS[method] ?? method}.`,
    url: "/admin/orders",
    tag: `staff-order-${order.id}`,
  });
}

/** Order paid (webhook) → staff and admins, so packing can start. */
export async function notifyOrderPaid({ order, method }) {
  return sendPushToRoles(["admin", "staff"], {
    title: "Order paid",
    body: `${reference(order.id)} · ${money(order.total_amount)} paid by ${
      METHOD_LABELS[method] ?? method
    }. Ready to prepare.`,
    url: "/admin/orders",
    tag: `staff-order-${order.id}`,
  });
}

/** Newly published announcement → all subscribed customers. */
export async function notifyAnnouncementPublished(announcement) {
  return sendPushToRoles(["customer"], {
    title: announcement.title,
    body: sentences(announcement.body) || "There is a new announcement from the store.",
    url: "/announcements",
    tag: `announcement-${announcement.id}`,
  });
}

/** Low stock → admins only; the same event also emails them (FR-10). */
export async function notifyLowStockPush(products) {
  const names = products
    .slice(0, 3)
    .map((product) => `${product.name} (${product.stock_qty})`)
    .join(", ");
  const rest = products.length > 3 ? ` and ${products.length - 3} more` : "";

  return sendPushToRoles(["admin"], {
    title: "Low stock",
    body: `${products.length} product${products.length === 1 ? "" : "s"} at or below reorder level: ${names}${rest}.`,
    url: "/admin/inventory",
    tag: "low-stock",
  });
}
