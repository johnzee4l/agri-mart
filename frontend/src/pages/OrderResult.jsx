import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Warning } from "@phosphor-icons/react";
import { ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import OrderStatusBadge from "../components/OrderStatusBadge.jsx";
import { formatPHP } from "@/lib/format.js";
import { ORDER_STATUSES, readOrder, readOrderItems } from "@/lib/orders.js";
import { useApi } from "@/lib/useApi.js";

/* Polls GET /orders/:id after payment return (blueprint 6.4 step 3) until the status
   leaves pending, the request fails, or roughly five minutes pass. */
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

export default function OrderResult() {
  const { id } = useParams();
  const location = useLocation();
  const paymentError = location.state?.paymentError ?? null;

  const { data, error, loading, reload } = useApi(id ? `/orders/${id}` : null);
  const attempts = useRef(0);
  const [exhausted, setExhausted] = useState(false);

  const order = readOrder(data);
  const status = order?.status ?? "pending";
  const settled = status !== "pending";
  const polling = !settled && !error && !exhausted;

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

  const shell = "mx-auto w-full max-w-[var(--container-content)] px-4 py-10 lg:px-10 lg:py-16";

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

  return (
    <section className={shell}>
      <p className="text-eyebrow font-bold text-primary-text uppercase">Order</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-display-lg text-fg">Order placed</h1>
        <OrderStatusBadge status={status} />
      </div>
      <p className="mt-3 max-w-[60ch] text-body-md text-fg-muted">
        {messages[status] ?? ORDER_STATUSES[status]?.label}
      </p>

      {paymentError ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md bg-warning-subtle p-3"
        >
          <Warning size={20} weight="bold" className="mt-0.5 shrink-0 text-warning-text" aria-hidden="true" />
          <p className="text-body-sm text-warning-text">{paymentError}</p>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-2">
        <p className="text-body-sm text-fg-muted">
          Order number: <span className="text-fg tabular-nums">{order?.id ?? id}</span>
        </p>
        {order?.total_amount != null ? (
          <p className="text-body-sm text-fg-muted">
            Total:{" "}
            <span className="font-semibold text-fg tabular-nums">
              {formatPHP(order.total_amount)}
            </span>
          </p>
        ) : null}
        {order?.fulfillment_type ? (
          <p className="text-body-sm text-fg-muted">
            Fulfillment:{" "}
            <span className="text-fg">
              {order.fulfillment_type === "delivery" ? "Delivery" : "Store pickup"}
            </span>
          </p>
        ) : null}
      </div>

      {items.length > 0 ? (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id ?? item.product_id}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="text-body-md text-fg">
                {item.name ?? item.product_name ?? `Product ${item.product_id}`}
                <span className="text-fg-muted tabular-nums"> × {item.quantity}</span>
              </span>
              <span className="text-body-md font-semibold text-fg tabular-nums">
                {formatPHP(item.subtotal ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {polling ? (
        <p className="mt-6 text-caption text-fg-subtle" aria-live="polite">
          Waiting for confirmation. This page updates on its own.
        </p>
      ) : null}

      {exhausted && !settled ? (
        <p className="mt-6 text-caption text-fg-subtle" aria-live="polite">
          Still waiting on the store. Refresh this page to check again.
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          to="/account"
          className="inline-flex h-[var(--control-md)] items-center rounded-full bg-primary px-5 text-label font-semibold text-on-primary hover:bg-primary-hover"
        >
          Track this order
        </Link>
        <Link
          to="/products"
          className="inline-flex h-[var(--control-md)] items-center rounded-full bg-primary-subtle px-5 text-label font-semibold text-primary-text hover:bg-primary-subtle/70"
        >
          Continue shopping
        </Link>
      </div>
    </section>
  );
}
