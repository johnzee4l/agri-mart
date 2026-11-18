import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Warning } from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import OrderCardStack from "../components/signature/OrderCardStack.jsx";
import OrderReceipt from "../components/signature/OrderReceipt.jsx";
import OrderStatusBadge from "../components/OrderStatusBadge.jsx";
import OrderTracker from "../components/OrderTracker.jsx";
import { formatClock, formatDate, formatPHP } from "@/lib/format.js";
import { ORDER_STATUSES, PAYMENT_METHODS, readOrder, readOrderItems } from "@/lib/orders.js";
import {
  attachIntent,
  createPaymentMethod,
  PAYMONGO_READY,
  parseCardExpiry,
  redirectUrlFor,
} from "@/lib/paymongo.js";
import { useApi } from "@/lib/useApi.js";

/* Order success (designtokens 12): the OrderReceipt and the OrderCardStack side by
   side, then order progress with a compact item strip. Polls GET /orders/:id after
   payment return (blueprint 6.4 step 3) until the status leaves pending, the request
   fails, or roughly five minutes pass. */
const POLL_MS = 3000;
const MAX_POLLS = 100;

const messages = {
  pending: "We have your order. It confirms as soon as payment or staff confirmation lands.",
  paid: "Payment received. We are preparing your order.",
  preparing: "Your order is being packed.",
  out_for_delivery: "Your order is on the way.",
  completed: "This order is complete. Thank you.",
  cancelled: "This order was cancelled. No payment was taken.",
};

function itemName(item) {
  return item.products?.name ?? item.name ?? item.product_name ?? `Product ${item.product_id}`;
}

function itemKey(item) {
  return item.id ?? item.product_id;
}

/* The deck carries one card per ordered item, so every product is reachable by
   prev/next or a drag without opening a separate list. */
function buildCards(items, fulfillment) {
  return items.map((item) => {
    const name = itemName(item);
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unit_price ?? 0);
    const lineTotal = Number(item.subtotal ?? unitPrice * quantity);
    const unit = item.products?.unit ?? "";
    const image = item.products?.image_url ?? null;

    return {
      id: itemKey(item),
      productId: item.product_id,
      title: name,
      subtitle: `${quantity} × ${formatPHP(unitPrice)}${unit ? ` · ${unit}` : ""}`,
      price: formatPHP(lineTotal),
      description:
        fulfillment === "pickup"
          ? "Collect this item with your pickup order."
          : "This item is part of your delivery.",
      specs: [
        { label: "Qty", value: String(quantity) },
        { label: "Unit", value: formatPHP(unitPrice) },
        { label: "Line", value: formatPHP(lineTotal) },
      ],
      art: image ? (
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-muted text-caption text-fg-subtle">
          No photo
        </span>
      ),
    };
  });
}

/* Status log under the tracker: what actually happened, in order. Times are only
   shown when the order payload carries one, never invented. */
function buildProgress(order, status, placedAt) {
  const payment = Array.isArray(order?.payments) ? order.payments[0] : order?.payments;
  const method = payment?.method
    ? PAYMENT_METHODS.find((option) => option.value === payment.method)?.label ?? payment.method
    : null;
  const paid = payment?.status === "paid";

  const entries = [
    {
      title: "Order placed",
      detail: placedAt || "Just now",
      done: true,
    },
  ];

  if (payment) {
    entries.push({
      title: paid
        ? `Payment received${method ? ` via ${method}` : ""}`
        : `Payment pending${method ? ` via ${method}` : ""}`,
      detail:
        paid && payment.paid_at
          ? `${formatDate(payment.paid_at)} · ${formatClock(payment.paid_at)}`
          : "The store confirms this once the payment is settled.",
      done: paid,
    });
  }

  const stage = {
    pending: "Waiting for the store to confirm the order.",
    paid: "The store has your payment and starts packing.",
    preparing: "The store is preparing your items for dispatch.",
    out_for_delivery: "The courier is bringing your order to you.",
    completed:
      order?.fulfillment_type === "pickup"
        ? "Collected from the store."
        : "Delivered to your address.",
    cancelled: "This order was cancelled.",
  }[status] ?? "Waiting for the next update from the store.";

  entries.push({
    title: ORDER_STATUSES[status]?.label ?? "In progress",
    detail: stage,
    done: status === "completed",
    active: status !== "completed" && status !== "cancelled",
  });

  return entries;
}

export default function OrderResult() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const paymentError = location.state?.paymentError ?? null;

  const { data, error, loading, reload } = useApi(id ? `/orders/${id}` : null);
  const attempts = useRef(0);
  const [exhausted, setExhausted] = useState(false);
  const [retryCard, setRetryCard] = useState({ card_number: "", expiry: "", cvc: "" });
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(null);

  const order = readOrder(data);
  const status = order?.status ?? "pending";
  const payment = Array.isArray(order?.payments) ? order.payments[0] : order?.payments;
  const settled = status !== "pending";
  const polling = !settled && !error && !exhausted;
  const canRetry =
    status === "pending" &&
    Boolean(payment) &&
    payment.method !== "cod" &&
    payment.status !== "paid" &&
    (Boolean(paymentError) || payment.status === "failed");

  const setRetryCardField = (field) => (event) =>
    setRetryCard((current) => ({ ...current, [field]: event.target.value }));

  /* Retry pays the existing order. POST /orders/:id/pay creates a fresh intent, so
     nothing is duplicated and the original items and prices are kept. */
  async function retryPayment() {
    if (!order || !payment || retrying) return;
    setRetryError(null);

    let cardDetails = null;

    if (payment.method === "card") {
      const expiry = parseCardExpiry(retryCard.expiry);
      if (retryCard.card_number.replace(/\s+/g, "").length < 12) {
        setRetryError("Enter the card number.");
        return;
      }
      if (!expiry) {
        setRetryError("Use MM/YY for the expiry.");
        return;
      }
      if (retryCard.cvc.length < 3) {
        setRetryError("Enter the CVC.");
        return;
      }

      cardDetails = {
        card_number: retryCard.card_number.replace(/\s+/g, ""),
        exp_month: expiry.exp_month,
        exp_year: expiry.exp_year,
        cvc: retryCard.cvc,
      };
    }

    setRetrying(true);

    try {
      const answer = await api.post(`/orders/${order.id}/pay`);
      const intentId = answer?.data?.intent_id ?? answer?.intent_id;
      const clientKey = answer?.data?.client_key ?? answer?.client_key;
      if (!intentId || !clientKey) throw new Error("The store did not return a payment intent.");

      const paymentMethod = await createPaymentMethod({
        type: payment.method,
        card: cardDetails ?? undefined,
      });

      const intent = await attachIntent({
        intentId,
        paymentMethodId: paymentMethod?.id,
        clientKey,
        returnUrl: `${window.location.origin}/orders/${order.id}`,
      });

      const redirect = redirectUrlFor(intent);
      if (redirect) {
        window.location.assign(redirect);
        return;
      }

      reload();
    } catch (retryFailure) {
      setRetryError(retryFailure.message ?? "The payment could not be restarted.");
    } finally {
      setRetrying(false);
    }
  }

  useEffect(() => {
    attempts.current = 0;
    setExhausted(false);
  }, [id]);

  useEffect(() => {
    if (!polling) return undefined;

    const timer = window.setInterval(() => {
      if (attempts.current >= MAX_POLLS) {
        setExhausted(true);
        window.clearInterval(timer);
        return;
      }
      attempts.current += 1;
      reload();
    }, POLL_MS);

    return () => window.clearInterval(timer);
  }, [polling, reload]);

  const shell =
    "mx-auto w-full max-w-[var(--container-wide)] px-4 py-10 lg:px-10 lg:py-16";

  if (loading && !order) {
    return (
      <div className={shell}>
        <LoadingLines rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={shell}>
        <ErrorNotice error={error} onRetry={reload} />
        <Link
          to="/products"
          className="mt-6 inline-block text-label font-semibold text-primary-text hover:underline"
        >
          Back to the catalog
        </Link>
      </div>
    );
  }

  const items = readOrderItems(order);
  const receiptItems = items.map((item) => ({
    name: itemName(item),
    quantity: Number(item.quantity ?? 0),
    price: Number(item.unit_price ?? 0),
  }));
  const cards = buildCards(items, order?.fulfillment_type);
  const shortId = String(order?.id ?? id ?? "").slice(0, 8).toUpperCase();
  const placedAt = order?.created_at
    ? `${formatDate(order.created_at)} · ${formatClock(order.created_at)}`
    : "";
  const note = messages[status] ?? ORDER_STATUSES[status]?.label;
  const progress = buildProgress(order, status, placedAt);

  return (
    <section className={`${shell} flex flex-col items-center`}>
      <div className="flex flex-col items-center text-center">
        <p className="inline-flex h-7 items-center rounded-full bg-primary-subtle px-3 text-caption font-semibold text-primary-text">
          Order
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <h1 className="text-display-lg text-fg">Order placed</h1>
          <OrderStatusBadge status={status} />
        </div>
        {note ? <p className="mt-3 max-w-[60ch] text-body-md text-fg-muted">{note}</p> : null}

        {paymentError ? (
          <div
            role="alert"
            className="mt-4 flex max-w-[60ch] items-start gap-2 rounded-md bg-warning-subtle p-3 text-left"
          >
            <Warning
              size={20}
              weight="bold"
              className="mt-0.5 shrink-0 text-warning-text"
              aria-hidden="true"
            />
            <p className="text-body-sm text-warning-text">{paymentError}</p>
          </div>
        ) : null}

        {canRetry ? (
          <div className="mt-4 w-full max-w-[32rem] rounded-xl bg-surface p-4 text-left">
            <h2 className="text-heading-sm text-fg">Finish this payment</h2>
            <p className="mt-1 text-body-sm text-fg-muted">
              Your order is saved. Retrying completes the payment for this same order; it does
              not create a second one.
            </p>

            {PAYMONGO_READY ? (
              <>
                {payment.method === "card" ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Input
                        label="Card number"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        value={retryCard.card_number}
                        onChange={setRetryCardField("card_number")}
                      />
                    </div>
                    <Input
                      label="Expiry (MM/YY)"
                      autoComplete="cc-exp"
                      value={retryCard.expiry}
                      onChange={setRetryCardField("expiry")}
                    />
                    <Input
                      label="CVC"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={retryCard.cvc}
                      onChange={setRetryCardField("cvc")}
                    />
                  </div>
                ) : null}

                {retryError ? (
                  <p
                    role="alert"
                    className="mt-3 rounded-md bg-danger-subtle p-3 text-body-sm text-danger-text"
                  >
                    {retryError}
                  </p>
                ) : null}

                <Button className="mt-4" onClick={retryPayment} loading={retrying}>
                  Pay {formatPHP(order?.total_amount ?? 0)}
                </Button>
              </>
            ) : (
              <p className="mt-3 rounded-md bg-warning-subtle p-3 text-body-sm text-warning-text">
                Online payment is not configured on this device. Contact the store to settle this
                order.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-10 grid w-full justify-center gap-8 lg:grid-cols-[minmax(0,30rem)_minmax(0,24rem)] lg:items-start">
        {cards.length > 0 ? (
          <OrderCardStack
            actionLabel="View product"
            cards={cards}
            accent="var(--primary)"
            className="lg:mx-0"
            onAction={(card) => card.productId && navigate(`/products/${card.productId}`)}
          />
        ) : null}
        <OrderReceipt
          className="mx-auto lg:mt-8"
          currency="₱"
          date={placedAt}
          fee={Number(order?.delivery_fee ?? 0)}
          items={receiptItems}
          merchant="AgriMart"
          order={shortId}
        />
      </div>

      <section className="mt-10 w-full rounded-xl bg-surface p-6 text-left">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-heading-sm text-fg">Order progress</h2>
            <div className="mt-4">
              <OrderTracker status={status} fulfillment={order?.fulfillment_type} />
            </div>

            <ol className="mt-6 flex flex-col gap-4">
              {progress.map((entry) => (
                <li key={entry.title} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                      entry.done ? "bg-primary" : entry.active ? "bg-tile-inverse" : "bg-muted"
                    }`}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-label font-semibold text-fg">{entry.title}</span>
                    <span className="text-caption text-fg-muted">{entry.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-heading-sm text-fg">Items</h2>
              <p className="text-caption text-fg-muted tabular-nums">
                {items.length} {items.length === 1 ? "product" : "products"}
              </p>
            </div>

            {items.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-2">
                {items.map((item) => {
                  const image = item.products?.image_url ?? null;
                  const unit = item.products?.unit ?? "";
                  return (
                    <li
                      key={itemKey(item)}
                      className="flex min-w-0 items-center gap-3 rounded-md bg-muted/60 px-3 py-2"
                    >
                      <span className="size-9 shrink-0 overflow-hidden rounded-sm bg-muted">
                        {image ? (
                          <img src={image} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-body-sm text-fg">{itemName(item)}</span>
                        <span className="text-caption text-fg-subtle tabular-nums">
                          {item.quantity} × {formatPHP(item.unit_price ?? 0)}
                          {unit ? ` · ${unit}` : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      {polling ? (
        <p className="mt-4 text-caption text-fg-subtle" aria-live="polite">
          Waiting for confirmation. This page updates on its own.
        </p>
      ) : null}

      {exhausted && !settled ? (
        <p className="mt-4 text-caption text-fg-subtle" aria-live="polite">
          Still waiting on the store. Refresh this page to check again.
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          to="/account?tab=orders"
          className="inline-flex h-[var(--control-md)] items-center rounded-full bg-primary px-5 text-label font-semibold text-on-primary hover:bg-primary-hover"
        >
          Track order
        </Link>
        <Link
          to="/products"
          className="inline-flex h-[var(--control-md)] items-center rounded-full bg-transparent px-5 text-label font-semibold text-fg hover:bg-muted"
        >
          Keep shopping
        </Link>
      </div>
    </section>
  );
}