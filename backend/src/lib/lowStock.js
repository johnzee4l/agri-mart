import { getAdminEmails } from "./profile.js";
import { sendLowStockAlert } from "./mailer.js";

/* FR-10. One alert per event, to every active admin. Called after a deduction or an
   adjustment that left a product at or below its reorder level.

   Best effort by design: the stock move is already committed, so a missing mailbox or
   an SMTP failure is logged and swallowed rather than failing the request. */

export async function notifyLowStock(products) {
  const low = (products ?? []).filter((product) => product?.id);
  if (low.length === 0) return 0;

  try {
    const recipients = await getAdminEmails();
    if (recipients.length === 0) return 0;

    await Promise.all(recipients.map((to) => sendLowStockAlert({ to, products: low })));
    return low.length;
  } catch (error) {
    console.error("[inventory] low-stock alert failed:", error.message);
    return 0;
  }
}
