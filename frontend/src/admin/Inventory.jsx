import { useState } from "react";
import { Package, Warning } from "@phosphor-icons/react";
import { api } from "@/lib/api.js";
import { cn } from "@/lib/cn.js";
import { useApi } from "@/lib/useApi.js";
import { asList, formatDate } from "@/lib/format.js";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import Button from "../components/ui/Button.jsx";
import Dialog from "../components/ui/Dialog.jsx";
import Input from "../components/ui/Input.jsx";
import Segmented from "../components/ui/Segmented.jsx";
import { AdminTable, Cell, Pagination, Row } from "./AdminTable.jsx";

/* FR-11 (blueprint 6.6 and 6.7). Stock-in, adjustment and spoilage all go through
   POST /inventory/adjust so every movement lands in the log against the person who
   made it. The low-stock panel is the SQL function's answer, not a client-side copy
   of the comparison, so it cannot drift from what the API believes. */

const PAGE_LIMIT = 20;

const SELECT_CLASS =
  "h-[var(--control-md)] rounded-md bg-surface px-3.5 text-base text-fg ring-1 ring-inset ring-field-edge";

const REASONS = [
  { value: "stock-in", label: "Stock in", hint: "Units arriving from a supplier." },
  { value: "adjustment", label: "Adjustment", hint: "A correction. Use a minus sign to reduce." },
  { value: "spoilage", label: "Spoilage", hint: "Damaged or expired units leaving the shelf." },
];

const REASON_LABELS = {
  "stock-in": "Stock in",
  sale: "Sale",
  adjustment: "Adjustment",
  spoilage: "Spoilage",
};

/** The signed change the API will receive for what was typed into the form. */
function signedChange(reason, units) {
  const value = Number(units);
  if (!Number.isFinite(value)) return null;
  if (reason === "spoilage") return -Math.abs(value);
  return value;
}

export default function Inventory() {
  const [page, setPage] = useState(1);
  const [logFilters, setLogFilters] = useState({ product_id: "", reason: "", from: "", to: "" });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ product_id: "", reason: "stock-in", units: "" });
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const products = useApi("/products?limit=60");
  const lowStock = useApi("/inventory/low-stock");

  const logQuery = new URLSearchParams();
  if (logFilters.product_id) logQuery.set("product_id", logFilters.product_id);
  if (logFilters.reason) logQuery.set("reason", logFilters.reason);
  if (logFilters.from) logQuery.set("from", logFilters.from);
  if (logFilters.to) logQuery.set("to", logFilters.to);
  logQuery.set("page", String(page));
  logQuery.set("limit", String(PAGE_LIMIT));

  const logs = useApi(`/inventory/logs?${logQuery.toString()}`);

  const productList = asList(products.data);
  const lowList = asList(lowStock.data);
  const logRows = asList(logs.data);
  const logTotal = logs.data?.total ?? logRows.length;
  const selected = productList.find((product) => product.id === form.product_id) ?? null;
  const change = signedChange(form.reason, form.units);
  const reasonHint = REASONS.find((entry) => entry.value === form.reason)?.hint ?? "";

  function openForm(productId = "") {
    setForm({ product_id: productId, reason: "stock-in", units: "" });
    setFormError(null);
    setFormOpen(true);
  }

  function reloadAll() {
    products.reload();
    lowStock.reload();
    logs.reload();
  }

  async function submitAdjustment(event) {
    event.preventDefault();
    setFormError(null);

    if (!form.product_id) {
      setFormError("Choose the product that moved.");
      return;
    }

    if (change === null || !Number.isInteger(change) || change === 0) {
      setFormError("Enter a whole number of units, not zero.");
      return;
    }

    if (form.reason === "stock-in" && change < 0) {
      setFormError("Stock in has to add units.");
      return;
    }

    setBusy(true);

    try {
      const payload = await api.post("/inventory/adjust", {
        product_id: form.product_id,
        change_qty: change,
        reason: form.reason,
      });

      const updated = payload?.data ?? null;
      const stillLow = Boolean(payload?.low_stock);
      const name = updated?.name ?? selected?.name ?? "That product";

      setNotice(
        stillLow
          ? `${name} is now at ${updated?.stock_qty} ${updated?.unit ?? ""} — still at or below the reorder level of ${updated?.reorder_level}. The admins have been emailed.`
          : `${name} is now at ${updated?.stock_qty} ${updated?.unit ?? ""}, back above its reorder level.`,
      );

      setForm({ product_id: "", reason: "stock-in", units: "" });
      setFormOpen(false);
      reloadAll();
    } catch (error) {
      setFormError(error.message ?? "That adjustment did not go through.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-heading-sm text-fg">Inventory</h2>
          <p className="text-body-sm text-fg-muted">
            {lowList.length} low-stock product{lowList.length === 1 ? "" : "s"} · {logTotal} logged
            movement{logTotal === 1 ? "" : "s"}
          </p>
        </div>

        <Button onClick={() => openForm()}>
          <Package size={18} weight="bold" aria-hidden="true" />
          Adjust stock
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-label font-semibold text-fg">Low stock</h3>

        {lowStock.error ? <ErrorNotice error={lowStock.error} onRetry={lowStock.reload} /> : null}
        {lowStock.loading && lowList.length === 0 ? <LoadingLines rows={2} /> : null}

        {!lowStock.loading && !lowStock.error && lowList.length === 0 ? (
          <p className="text-body-sm text-fg-muted">
            Every product is above its reorder level.
          </p>
        ) : null}

        {lowList.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {lowList.map((product) => (
              <li
                key={product.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-warning-subtle p-3"
              >
                <span className="flex items-center gap-3">
                  <Warning size={20} weight="bold" className="text-warning-text" aria-hidden="true" />
                  <span className="flex flex-col">
                    <span className="text-body-sm font-semibold text-warning-text">
                      {product.name}
                    </span>
                    <span className="text-caption text-warning-text tabular-nums">
                      {product.stock_qty} {product.unit ?? ""} left · reorder at{" "}
                      {product.reorder_level}
                    </span>
                  </span>
                </span>

                <Button size="sm" variant="secondary" onClick={() => openForm(product.id)}>
                  Stock in
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {notice ? (
        <p role="status" className="rounded-md bg-primary-subtle p-3 text-body-sm text-primary-text">
          {notice}
        </p>
      ) : null}

      <h3 className="text-label font-semibold text-fg">Inventory log</h3>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-2">
          <span className="text-label font-semibold text-fg">Product</span>
          <select
            value={logFilters.product_id}
            onChange={(event) => {
              setPage(1);
              setLogFilters((current) => ({ ...current, product_id: event.target.value }));
            }}
            className={SELECT_CLASS}
          >
            <option value="">All products</option>
            {productList.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-label font-semibold text-fg">Reason</span>
          <select
            value={logFilters.reason}
            onChange={(event) => {
              setPage(1);
              setLogFilters((current) => ({ ...current, reason: event.target.value }));
            }}
            className={SELECT_CLASS}
          >
            <option value="">All reasons</option>
            {Object.entries(REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="w-[11rem]">
          <Input
            label="From"
            type="date"
            value={logFilters.from}
            onChange={(event) => {
              setPage(1);
              setLogFilters((current) => ({ ...current, from: event.target.value }));
            }}
          />
        </div>

        <div className="w-[11rem]">
          <Input
            label="To"
            type="date"
            value={logFilters.to}
            onChange={(event) => {
              setPage(1);
              setLogFilters((current) => ({ ...current, to: event.target.value }));
            }}
          />
        </div>

        <Button
          variant="ghost"
          onClick={() => {
            setLogFilters({ product_id: "", reason: "", from: "", to: "" });
            setPage(1);
          }}
        >
          Clear filters
        </Button>
      </div>

      {logs.error ? <ErrorNotice error={logs.error} onRetry={logs.reload} /> : null}
      {logs.loading && logRows.length === 0 ? <LoadingLines rows={4} /> : null}

      {!logs.loading && !logs.error && logRows.length === 0 ? (
        <EmptyState
          title="No stock movements yet"
          body="Stock in, adjustments and spoilage all appear here with the account that recorded them."
        />
      ) : null}

      {logRows.length > 0 ? (
        <AdminTable
          columns={[
            { label: "When" },
            { label: "Product" },
            { label: "Reason" },
            { label: "Change", align: "right" },
            { label: "Recorded by", align: "right" },
          ]}
        >
          {logRows.map((row, index) => (
            <Row key={row.id} index={index}>
              <Cell className="text-fg-muted">{formatDate(row.created_at)}</Cell>
              <Cell>
                <span className="flex items-center gap-3">
                  <span className="flex flex-col">
                    <span className="font-semibold text-fg">
                      {row.products?.name ?? "Product"}
                    </span>
                    {row.products?.unit ? (
                      <span className="text-caption text-fg-muted">{row.products.unit}</span>
                    ) : null}
                  </span>
                </span>
              </Cell>
              <Cell className="text-fg-muted">{REASON_LABELS[row.reason] ?? row.reason}</Cell>
              <Cell
                align="right"
                className={cn(
                  "font-semibold tabular-nums",
                  row.change_qty > 0 ? "text-primary-text" : "text-danger-text",
                )}
              >
                {row.change_qty > 0 ? "+" : "−"}
                {Math.abs(row.change_qty)}
              </Cell>
              <Cell align="right" className="text-fg-muted tabular-nums">
                {row.user_id?.slice(0, 8) ?? "—"}
              </Cell>
            </Row>
          ))}
        </AdminTable>
      ) : null}

      <Pagination page={page} total={logTotal} limit={PAGE_LIMIT} onPage={setPage} />

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title="Adjust stock">
        <form onSubmit={submitAdjustment} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-label font-semibold text-fg">Product</span>
            <select
              value={form.product_id}
              onChange={(event) =>
                setForm((current) => ({ ...current, product_id: event.target.value }))
              }
              className={SELECT_CLASS}
            >
              <option value="">Choose a product</option>
              {productList.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} · {product.stock_qty} {product.unit ?? ""} on hand
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-label font-semibold text-fg">Reason</span>
            <Segmented
              label="Movement reason"
              value={form.reason}
              onChange={(value) => setForm((current) => ({ ...current, reason: value }))}
              items={REASONS.map((entry) => ({ value: entry.value, label: entry.label }))}
            />
            <p className="text-caption text-fg-subtle">{reasonHint}</p>
          </div>

          <Input
            label={
              form.reason === "spoilage"
                ? "Units spoiled"
                : form.reason === "stock-in"
                  ? "Units received"
                  : "Change (use − for a reduction)"
            }
            type="number"
            step="1"
            inputMode="numeric"
            value={form.units}
            onChange={(event) => setForm((current) => ({ ...current, units: event.target.value }))}
            hint={
              change === null || change === 0
                ? "A whole number, and not zero."
                : `Stock will change by ${change > 0 ? "+" : "−"}${Math.abs(change)}${selected ? ` on ${selected.name}` : ""}.`
            }
            error={formError}
            autoComplete="off"
          />

          <div className="flex items-center gap-3">
            <Button type="submit" loading={busy} disabled={productList.length === 0}>
              Record movement
            </Button>
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
