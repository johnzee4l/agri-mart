import { Link } from "react-router-dom";
import { Warning } from "@phosphor-icons/react";
import { useApi } from "@/lib/useApi.js";
import { formatDate, formatPHP } from "@/lib/format.js";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import OrderStatusBadge from "../components/OrderStatusBadge.jsx";

/* FR-10, FR-18 (blueprint 6.7). Dashboard: sales totals, low stock and recent orders
   on the dense canvas. KPIs are typographic, never cards (designtokens 8.5, 12), and
   GET /reports/summary only fills `sales` for an admin, so staff get the same page
   without the money.

   One request: the summary already carries counts, the live low-stock list and the five
   newest orders, and staff are allowed to read it. */

function Kpi({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-caption font-semibold text-fg-muted uppercase">{label}</span>
      <span className="text-heading-md tabular-nums text-fg">{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const summary = useApi("/reports/summary");

  const payload = summary.data?.data ?? null;
  const lowStock = payload?.low_stock ?? [];
  const recentOrders = payload?.recent_orders ?? [];

  if (summary.error) {
    return <ErrorNotice error={summary.error} onRetry={summary.reload} />;
  }

  if (summary.loading && !payload) {
    return <LoadingLines rows={4} />;
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end gap-10">
        <h2 className="sr-only">Dashboard</h2>
        <Kpi label="Customers" value={payload?.counts?.customers ?? 0} />
        <Kpi label="Orders" value={payload?.counts?.orders ?? 0} />
        <Kpi label="Low stock" value={payload?.counts?.low_stock ?? 0} />
      </div>

      {payload?.sales ? (
        <section className="flex flex-col gap-4" aria-labelledby="sales-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 id="sales-heading" className="text-heading-sm text-fg">
                Sales
              </h3>
              <p className="text-caption text-fg-muted">Last 30 days</p>
            </div>
            <Link to="/admin/reports" className="text-body-sm font-semibold text-primary-text">
              Open reports
            </Link>
          </div>

          <div className="flex flex-wrap items-end gap-10">
            <Kpi label="Revenue" value={formatPHP(payload.sales.revenue)} />
            <Kpi label="Orders" value={payload.sales.orders} />
            <Kpi label="Average order" value={formatPHP(payload.sales.average)} />
          </div>
        </section>
      ) : (
        <p className="text-body-sm text-fg-muted">
          Sales totals are for admins. Orders and stock are yours to run from here.
        </p>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="low-stock-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="low-stock-heading" className="text-heading-sm text-fg">
            Low stock
          </h3>
          <Link to="/admin/inventory" className="text-body-sm font-semibold text-primary-text">
            Open inventory
          </Link>
        </div>

        {lowStock.length === 0 ? (
          <p className="text-body-sm text-fg-muted">
            Every product is above its reorder level.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-body-sm">
              <thead>
                <tr className="text-caption font-semibold text-fg-muted uppercase">
                  <th scope="col" className="pb-2 text-left">
                    Product
                  </th>
                  <th scope="col" className="pb-2 text-right">
                    Stock
                  </th>
                  <th scope="col" className="pb-2 text-right">
                    Reorder at
                  </th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((product, index) => (
                  <tr key={product.id} className={index % 2 === 1 ? "bg-muted" : undefined}>
                    <td className="h-[var(--row-h)] rounded-l-md px-3 text-fg">
                      <span className="flex items-center gap-2">
                        <Warning size={16} weight="bold" className="text-warning-text" aria-hidden="true" />
                        {product.name}
                      </span>
                    </td>
                    <td className="h-[var(--row-h)] px-3 text-right tabular-nums text-fg">
                      {product.stock_qty} {product.unit}
                    </td>
                    <td className="h-[var(--row-h)] rounded-r-md px-3 text-right tabular-nums text-fg-muted">
                      {product.reorder_level}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="recent-orders-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="recent-orders-heading" className="text-heading-sm text-fg">
            Recent orders
          </h3>
          <Link to="/admin/orders" className="text-body-sm font-semibold text-primary-text">
            Open orders
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <EmptyState title="No orders yet" body="New orders appear here as they are placed." />
        ) : (
          <ul className="flex flex-col gap-2">
            {recentOrders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-label font-semibold tabular-nums text-fg">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <OrderStatusBadge status={order.status} />
                  <span className="text-caption text-fg-muted">
                    {order.fulfillment_type === "pickup" ? "Pickup" : "Delivery"} ·{" "}
                    {formatDate(order.created_at)}
                  </span>
                </div>
                <span className="text-label font-semibold tabular-nums text-fg">
                  {formatPHP(order.total_amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
