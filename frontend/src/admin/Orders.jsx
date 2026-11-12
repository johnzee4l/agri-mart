import { useState } from "react";
import { Eye, Receipt } from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import { useApi } from "@/lib/useApi.js";
import { asList, formatDate, formatPHP } from "@/lib/format.js";
import { ORDER_STATUSES, PAYMENT_METHODS } from "@/lib/orders.js";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import OrderStatusBadge from "../components/OrderStatusBadge.jsx";
import Button from "../components/ui/Button.jsx";
import Dialog from "../components/ui/Dialog.jsx";
import Input from "../components/ui/Input.jsx";
import { AdminTable, Cell, Pagination, Row } from "./AdminTable.jsx";

/* FR-8 (blueprint 6.7). Staff and admin see every order, filter by status and date,
   read the detail, and move an order along. The moves offered here are exactly the
   ones GET /orders/:id + PATCH /orders/:id/status accept: TRANSITIONS in
   routes/orders.js, COD may skip paid straight to preparing, and a pickup order
   never goes out for delivery. */

const PAGE_LIMIT = 20;

const SELECT_CLASS =
  "h-[var(--control-md)] rounded-md bg-surface px-3.5 text-base text-fg ring-1 ring-inset ring-field-edge";

/* Mirrors TRANSITIONS in backend/src/routes/orders.js. */
const TRANSITIONS = {
  pending: ["paid", "cancelled"],
  paid: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "completed", "cancelled"],
  out_for_delivery: ["completed"],
  completed: [],
  cancelled: [],
};

const PAYMENT_STATUS = {
  pending: "Unpaid",
  paid: "Paid",
  failed: "Failed",
};

/* payments is a to-one embed, so PostgREST may answer with the row or a one-row array. */
function paymentOf(order) {
  if (!order) return null;
  return Array.isArray(order.payments) ? (order.payments[0] ?? null) : (order.payments ?? null);
}

function methodLabel(method) {
  return PAYMENT_METHODS.find((entry) => entry.value === method)?.label ?? method ?? "—";
}

/** The moves the API will accept for this order, in the order staff work through them. */
function nextStatuses(order) {
  const targets = new Set(TRANSITIONS[order.status] ?? []);

  // A COD order may be confirmed before any money moves (assertTransition).
  if (order.status === "pending" && paymentOf(order)?.method === "cod") targets.add("preparing");
  // Pickup orders skip out for delivery.
  if (order.fulfillment_type === "pickup") targets.delete("out_for_delivery");

  return [...targets];
}

function orderRef(id) {
  return `#${id.slice(0, 8).toUpperCase()}`;
}

export default function Orders() {
  const [status, setStatus] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [page, setPage] = useState(1);

  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (range.from) query.set("from", range.from);
  if (range.to) query.set("to", range.to);
  query.set("page", String(page));
  query.set("limit", String(PAGE_LIMIT));

  const orders = useApi(`/orders?${query.toString()}`);
  const detail = useApi(openId ? `/orders/${openId}` : null);

  const rows = asList(orders.data);
  const total = orders.data?.total ?? rows.length;
  const order = detail.data?.data ?? null;

  function resetPage() {
    setPage(1);
    setNotice(null);
    setActionError(null);
  }

  function closeDetail() {
    setOpenId(null);
    detail.reload();
  }

  async function changeStatus(target) {
    if (!order) return;

    setBusy(true);
    setActionError(null);

    try {
      await api.patch(`/orders/${order.id}/status`, { status: target });
      orders.reload();
      detail.reload();
      setNotice(
        `${orderRef(order.id)} is now ${ORDER_STATUSES[target]?.label.toLowerCase() ?? target}.`,
      );
    } catch (error) {
      setActionError(error.message ?? "That status change did not go through.");
    } finally {
      setBusy(false);
    }
  }

  const payment = paymentOf(order);
  const itemCount = Array.isArray(order?.order_items) ? order.order_items.length : 0;
  const subtotal = order ? Number(order.total_amount) - Number(order.delivery_fee) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-heading-sm text-fg">Orders</h2>
          <p className="text-body-sm text-fg-muted">
            {total} order{total === 1 ? "" : "s"}
            {status ? ` with status ${ORDER_STATUSES[status]?.label.toLowerCase() ?? status}` : ""}
          </p>
        </div>

        <Button variant="secondary" onClick={orders.reload} loading={orders.loading}>
          <Receipt size={18} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-2">
          <span className="text-label font-semibold text-fg">Status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              resetPage();
            }}
            className={SELECT_CLASS}
          >
            <option value="">All statuses</option>
            {Object.entries(ORDER_STATUSES).map(([value, entry]) => (
              <option key={value} value={value}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <div className="w-[11rem]">
          <Input
            label="From"
            type="date"
            value={range.from}
            onChange={(event) => {
              setRange((current) => ({ ...current, from: event.target.value }));
              resetPage();
            }}
          />
        </div>

        <div className="w-[11rem]">
          <Input
            label="To"
            type="date"
            value={range.to}
            onChange={(event) => {
              setRange((current) => ({ ...current, to: event.target.value }));
              resetPage();
            }}
          />
        </div>

        <Button
          variant="ghost"
          onClick={() => {
            setStatus("");
            setRange({ from: "", to: "" });
            resetPage();
          }}
        >
          Clear filters
        </Button>
      </div>

      {notice ? (
        <p role="status" className="rounded-md bg-primary-subtle p-3 text-body-sm text-primary-text">
          {notice}
        </p>
      ) : null}

      {actionError ? (
        <p role="alert" className="rounded-md bg-danger-subtle p-3 text-body-sm text-danger-text">
          {actionError}
        </p>
      ) : null}

      {orders.error ? <ErrorNotice error={orders.error} onRetry={orders.reload} /> : null}
      {orders.loading && rows.length === 0 ? <LoadingLines rows={5} /> : null}

      {!orders.loading && !orders.error && rows.length === 0 ? (
        <EmptyState
          title="No orders here"
          body="Orders appear as customers place them. Change the status or date filters to look further back."
        />
      ) : null}

      {rows.length > 0 ? (
        <AdminTable
          columns={[
            { label: "Order" },
            { label: "Placed" },
            { label: "Fulfilment" },
            { label: "Payment" },
            { label: "Total", align: "right" },
            { label: "Status" },
            { label: "Actions", align: "right" },
          ]}
        >
          {rows.map((row, index) => {
            const rowPayment = paymentOf(row);

            return (
              <Row key={row.id} index={index}>
                <Cell>
                  <span className="font-semibold text-fg tabular-nums">{orderRef(row.id)}</span>
                </Cell>
                <Cell className="text-fg-muted">{formatDate(row.created_at)}</Cell>
                <Cell className="text-fg-muted">
                  {row.fulfillment_type === "pickup" ? "Store pickup" : "Delivery"}
                </Cell>
                <Cell className="text-fg-muted">
                  {methodLabel(rowPayment?.method)}
                  {rowPayment?.status ? (
                    <span className="ml-2 text-caption text-fg-subtle">
                      {PAYMENT_STATUS[rowPayment.status] ?? rowPayment.status}
                    </span>
                  ) : null}
                </Cell>
                <Cell align="right" className="tabular-nums text-fg">
                  {formatPHP(row.total_amount)}
                </Cell>
                <Cell>
                  <OrderStatusBadge status={row.status} />
                </Cell>
                <Cell align="right">
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(row.id)}>
                    <Eye size={16} aria-hidden="true" />
                    View
                  </Button>
                </Cell>
              </Row>
            );
          })}
        </AdminTable>
      ) : null}

      <Pagination page={page} total={total} limit={PAGE_LIMIT} onPage={setPage} />

      <Dialog
        open={Boolean(openId)}
        onClose={closeDetail}
        title={order ? `Order ${orderRef(order.id)}` : "Order"}
        className="max-w-[40rem]"
      >
        {detail.error ? <ErrorNotice error={detail.error} onRetry={detail.reload} /> : null}
        {detail.loading && !order ? <LoadingLines rows={4} /> : null}

        {order ? (
          <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto">
            <div className="flex flex-wrap items-center gap-3">
              <OrderStatusBadge status={order.status} />
              <span className="text-body-sm text-fg-muted">
                {order.fulfillment_type === "pickup" ? "Store pickup" : "Delivery"}
              </span>
              <span className="text-body-sm text-fg-muted">{formatDate(order.created_at)}</span>
              {order.stock_deducted ? (
                <span className="text-caption text-fg-subtle">Stock deducted</span>
              ) : null}
            </div>

            <div className="rounded-md bg-muted p-4">
              <p className="text-label font-semibold text-fg">Items</p>
              <ul className="mt-3 flex flex-col gap-3">
                {(order.order_items ?? []).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-3">
                      {item.products?.image_url ? (
                        <img
                          src={item.products.image_url}
                          alt=""
                          className="size-8 rounded-md object-cover"
                        />
                      ) : null}
                      <span className="flex flex-col">
                        <span className="text-body-sm font-semibold text-fg">
                          {item.products?.name ?? "Product"}
                        </span>
                        <span className="text-caption text-fg-muted tabular-nums">
                          {item.quantity} × {formatPHP(item.unit_price)}
                          {item.products?.unit ? ` / ${item.products.unit}` : ""}
                        </span>
                      </span>
                    </span>
                    <span className="text-body-sm text-fg tabular-nums">
                      {formatPHP(item.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
              {itemCount === 0 ? (
                <p className="mt-2 text-body-sm text-fg-muted">
                  This order has no line items on record.
                </p>
              ) : null}
            </div>

            <dl className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-body-sm text-fg-muted">Items</dt>
                <dd className="text-body-sm text-fg tabular-nums">{formatPHP(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-body-sm text-fg-muted">
                  {order.fulfillment_type === "pickup" ? "Delivery fee (pickup)" : "Delivery fee"}
                </dt>
                <dd className="text-body-sm text-fg tabular-nums">
                  {formatPHP(order.delivery_fee)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-label font-semibold text-fg">Total</dt>
                <dd className="text-label font-semibold text-fg tabular-nums">
                  {formatPHP(order.total_amount)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-body-sm text-fg-muted">Payment</dt>
                <dd className="text-body-sm text-fg">
                  {methodLabel(payment?.method)}
                  {payment?.status ? ` · ${PAYMENT_STATUS[payment.status] ?? payment.status}` : ""}
                  {payment?.paid_at ? ` · ${formatDate(payment.paid_at)}` : ""}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-body-sm text-fg-muted">Customer account</dt>
                <dd className="text-body-sm text-fg-muted tabular-nums">
                  {order.user_id.slice(0, 8)}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-3">
              <p className="text-label font-semibold text-fg">Move this order</p>

              {nextStatuses(order).length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {nextStatuses(order).map((target) => (
                    <Button
                      key={target}
                      size="sm"
                      variant={target === "cancelled" ? "ghost" : "primary"}
                      disabled={busy}
                      onClick={() => changeStatus(target)}
                    >
                      {target === "cancelled"
                        ? "Cancel order"
                        : `Mark ${ORDER_STATUSES[target]?.label.toLowerCase() ?? target}`}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-body-sm text-fg-muted">
                  {order.status === "completed"
                    ? "This order is complete. Nothing left to move."
                    : "This order was cancelled. Nothing left to move."}
                </p>
              )}

              <p className="text-caption text-fg-subtle">
                Every change emails the customer. Confirming a cash-on-delivery order deducts
                stock; completing one marks it paid.
              </p>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
