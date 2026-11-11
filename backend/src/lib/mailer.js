import nodemailer from "nodemailer";

/* FR-7. Gmail SMTP through Nodemailer. Mail is best effort: a missing SMTP config or
   a provider hiccup must never fail an order that is already written, so every send
   resolves to true or false and logs its reason. */

let transport = null;

export function mailerConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

export async function sendMail({ to, subject, text }) {
  if (!mailerConfigured() || !to) return false;

  try {
    await getTransport().sendMail({
      from: `AgriMart <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    return true;
  } catch (error) {
    console.error("[mail]", error.message);
    return false;
  }
}

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function money(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? peso.format(amount) : "—";
}

function lines(items) {
  return items
    .map((item) => `  ${item.quantity} × ${item.name ?? "item"} — ${money(item.subtotal)}`)
    .join("\n");
}

export function sendOrderConfirmation({ to, order, items }) {
  return sendMail({
    to,
    subject: `AgriMart order confirmed: ${String(order.id).slice(0, 8)}`,
    text: [
      "Thanks for ordering from AgriMart.",
      "",
      `Order: ${order.id}`,
      `Fulfillment: ${order.fulfillment_type === "delivery" ? "Delivery" : "Store pickup"}`,
      "",
      lines(items),
      "",
      `Delivery fee: ${money(order.delivery_fee)}`,
      `Total: ${money(order.total_amount)}`,
      "",
      "We will email you again when the status changes.",
    ].join("\n"),
  });
}

export function sendOrderStatus({ to, order }) {
  return sendMail({
    to,
    subject: `AgriMart order ${String(order.id).slice(0, 8)} is now ${order.status}`,
    text: [
      `Your order ${order.id} is now marked "${order.status}".`,
      "",
      `Total: ${money(order.total_amount)}`,
      "",
      "Open your account to see the order and its progress.",
    ].join("\n"),
  });
}
