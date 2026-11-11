import { getAdminEmails } from "./profile.js";
import { sendLowStockAlert } from "./mailer.js";
import { notifyLowStockPush } from "./pushEvents.js";

/* FR-10. One alert per event, to every active admin: an email and a push. Called after
   a deduction or an adjustment that left a product at or below its reorder level.

   Best effort by design: the stock move is already committed, so a missing mailbox, a
   failing SMTP relay or an unconfigured push service is logged and swallowed rather
   than failing the request. */

export async function notifyLowStock(products) {
  const low = (products ?? []).filter((product) => product?.id);
  if (low.length === 0) return 0;

  // Push first: it must not wait on SMTP, and neither channel may block the other.
  notifyLowStockPush(low).catch((error) => {
    console.error("[inventory] low-stock push failed:", error.message);
  });

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
