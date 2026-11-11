import { ApiError } from "./errors.js";

/* FR-6. PayMongo Payment Intents over plain fetch (no SDK), secret key only.
   Verified against the current docs: POST /v1/payment_intents with a Basic auth
   header built from the secret key, amount in centavos, and a `client_key` in the
   response that the browser uses to attach a payment method.

   The browser creates the payment method and attaches it with a return_url
   (frontend lib/paymongo.js); this module only creates the intent. */

const API = "https://api.paymongo.com/v1";
const TIMEOUT_MS = 15_000;

export function paymongoConfigured() {
  return Boolean(process.env.PAYMONGO_SECRET_KEY);
}

function authorization() {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new ApiError(503, "Online payment is not configured");
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

function details(payload) {
  return payload?.errors?.[0]?.detail ?? null;
}

/**
 * Creates an intent for one of gcash, card or grab_pay.
 * @returns {Promise<{ id: string, clientKey: string, status: string }>}
 */
export async function createPaymentIntent({ amount, method, description }) {
  const response = await fetch(`${API}/payment_intents`, {
    method: "POST",
    headers: {
      Authorization: authorization(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: Math.round(Number(amount) * 100),
          currency: "PHP",
          capture_type: "automatic",
          payment_method_allowed: [method],
          description,
        },
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(502, details(payload) ?? "PayMongo rejected the payment intent");
  }

  const intent = payload?.data;
  const clientKey = intent?.attributes?.client_key ?? null;

  if (!intent?.id || !clientKey) {
    throw new ApiError(502, "PayMongo did not return a usable payment intent");
  }

  return { id: intent.id, clientKey, status: intent.attributes?.status ?? "awaiting_payment_method" };
}
