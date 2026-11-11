/* FR-6. PayMongo browser step (blueprint 6.4 step 3). Only the public key runs here;
   the secret key stays on the API. The server creates the Payment Intent and returns
   its id and client_key, then this creates the payment method, attaches it with a
   return_url, and follows any redirect.

   The blueprint asks for the request shapes to be confirmed against the current
   PayMongo API docs in Member 2's Phase 3. Until that check lands, treat these
   shapes as unverified against the sandbox. */

const API = "https://api.paymongo.com/v1";
const PUBLIC_KEY = import.meta.env?.VITE_PAYMONGO_PUBLIC_KEY;

export const PAYMONGO_READY = Boolean(PUBLIC_KEY);

function authHeader() {
  return `Basic ${btoa(`${PUBLIC_KEY}:`)}`;
}

async function post(path, body) {
  if (!PUBLIC_KEY) {
    throw new Error("Online payment is not configured yet. Choose cash on delivery.");
  }

  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.errors?.[0]?.detail ?? "PayMongo could not start this payment.");
  }
  return payload?.data ?? null;
}

/** Card details for the card method. Everything else needs no details. */
export async function createPaymentMethod({ type, card }) {
  const details = type === "card" && card ? { details: card } : {};
  return post("/payment_methods", { data: { attributes: { type, ...details } } });
}

export async function attachIntent({ intentId, paymentMethodId, clientKey, returnUrl }) {
  return post(`/payment_intents/${intentId}/attach`, {
    data: {
      attributes: {
        payment_method: paymentMethodId,
        client_key: clientKey,
        return_url: returnUrl,
      },
    },
  });
}

export function redirectUrlFor(intent) {
  return intent?.attributes?.next_action?.redirect?.url ?? null;
}

/** "MM/YY" (or MM/YYYY) to the exp_month / exp_year pair PayMongo expects. */
export function parseCardExpiry(value) {
  const [month, year] = String(value).split("/").map((part) => part.trim());
  const expMonth = Number(month);
  const yearNumber = Number(year);
  if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) return null;
  if (!Number.isInteger(yearNumber) || yearNumber < 0) return null;

  // Accept both 26 and 2026 as the year.
  const expYear = yearNumber < 100 ? 2000 + yearNumber : yearNumber;
  return { exp_month: expMonth, exp_year: expYear };
}
