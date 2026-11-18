import { useState } from "react";
import { ChartBar, DownloadSimple, Printer } from "@phosphor-icons/react";

import { api } from "@/lib/api.js";
import { asList, formatDate, formatPHP } from "@/lib/format.js";
import { useApi } from "@/lib/useApi.js";
import { cn } from "@/lib/cn.js";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import { AdminTable, Cell, Row } from "./AdminTable.jsx";

/* FR-18 (blueprint 6.6). Four reports: sales by day, current inventory, the low-stock
   list and the top products in a range. CSV is downloaded from the API with the same
   query; PDF is the browser print view, with the admin shell hidden. */

const TYPES = [
  {
    value: "sales",
    label: "Sales",
    blurb: "Revenue and order count for each day in the range.",
    dated: true,
  },
  {
    value: "inventory",
    label: "Inventory",
    blurb: "Every active product with on-hand stock and its value.",
    dated: false,
  },
  {
    value: "low-stock",
    label: "Low stock",
    blurb: "Products at or below their reorder level, with the shortfall.",
    dated: false,
  },
  {
    value: "top-products",
    label: "Top products",
    blurb: "The ten best sellers by units in the range.",
    dated: true,
  },
];

const COLUMNS = {
  sales: [
    { label: "Day", value: (row) => formatDate(row.day) },
    { label: "Orders", align: "right", value: (row) => row.orders },
    { label: "Revenue", align: "right", value: (row) => formatPHP(row.revenue) },
  ],
  inventory: [
    { label: "Product", value: (row) => row.name },
    { label: "Unit", value: (row) => row.unit },
    { label: "Price", align: "right", value: (row) => formatPHP(row.price) },
    { label: "Stock", align: "right", value: (row) => row.stock_qty },
    { label: "Stock value", align: "right", value: (row) => formatPHP(row.stock_value) },
    { label: "Reorder at", align: "right", value: (row) => row.reorder_level },
    { label: "Low", value: (row) => (row.low ? "Yes" : "No") },
  ],
  "low-stock": [
    { label: "Product", value: (row) => row.name },
    { label: "Unit", value: (row) => row.unit },
    { label: "Stock", align: "right", value: (row) => row.stock_qty },
    { label: "Reorder at", align: "right", value: (row) => row.reorder_level },
    { label: "Shortfall", align: "right", value: (row) => row.shortfall },
  ],
  "top-products": [
    { label: "Product", value: (row) => row.name },
    { label: "Units", align: "right", value: (row) => row.quantity },
    { label: "Revenue", align: "right", value: (row) => formatPHP(row.revenue) },
  ],
};

function localDate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { from: localDate(from), to: localDate(to) };
}

function rangeQuery(type, range) {
  const dated = TYPES.find((entry) => entry.value === type)?.dated;
  if (!dated) return "";

  const query = new URLSearchParams();
  if (range.from) query.set("from", range.from);
  if (range.to) query.set("to", range.to);
  const text = query.toString();
  return text ? `?${text}` : "";
}

function summaryFor(type, rows) {
  if (type === "sales") {
    const revenue = rows.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);
    const orders = rows.reduce((sum, row) => sum + Number(row.orders ?? 0), 0);
    return [
      { label: "Days", value: rows.length },
      { label: "Orders", value: orders },
      { label: "Revenue", value: formatPHP(revenue) },
    ];
  }

  if (type === "inventory") {
    const value = rows.reduce((sum, row) => sum + Number(row.stock_value ?? 0), 0);
    const low = rows.filter((row) => row.low).length;
    return [
      { label: "Products", value: rows.length },
      { label: "Stock value", value: formatPHP(value) },
      { label: "Below reorder", value: low },
    ];
  }

  if (type === "low-stock") {
    const shortfall = rows.reduce((sum, row) => sum + Number(row.shortfall ?? 0), 0);
    return [
      { label: "Products", value: rows.length },
      { label: "Units short", value: shortfall },
    ];
  }

  const units = rows.reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
  const revenue = rows.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);
  return [
    { label: "Products", value: rows.length },
    { label: "Units sold", value: units },
    { label: "Revenue", value: formatPHP(revenue) },
  ];
}

export default function Reports() {
  const [type, setType] = useState("sales");
  const [range, setRange] = useState(defaultRange);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const active = TYPES.find((entry) => entry.value === type) ?? TYPES[0];
  const invalidRange =
    active.dated && range.from && range.to && range.from > range.to;

  const report = useApi(invalidRange ? null : `/reports/${type}${rangeQuery(type, range)}`);
  const rows = asList(report.data);
  const columns = COLUMNS[type] ?? [];
  const summary = summaryFor(type, rows);

  async function downloadCsv() {
    setDownloading(true);
    setActionError(null);

    try {
      const query = new URLSearchParams({ format: "csv" });
      if (active.dated) {
        if (range.from) query.set("from", range.from);
        if (range.to) query.set("to", range.to);
      }

      const { blob, filename } = await api.download(`/reports/${type}?${query.toString()}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setActionError(error.message ?? "Could not download the report.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-heading-sm text-fg">Reports</h2>
          <p className="text-body-sm text-fg-muted">
            {active.blurb} CSV opens in any spreadsheet; Print saves a PDF.
          </p>
        </div>

        <div className="no-print flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={downloading}
            disabled={report.loading || invalidRange}
            onClick={downloadCsv}
          >
            <DownloadSimple size={18} aria-hidden="true" />
            Download CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={report.loading || invalidRange || rows.length === 0}
            onClick={() => window.print()}
          >
            <Printer size={18} aria-hidden="true" />
            Print / PDF
          </Button>
        </div>
      </div>

      <div className="no-print flex flex-col gap-4">
        <div
          role="tablist"
          aria-label="Report type"
          className="flex flex-wrap items-center gap-1 rounded-full bg-muted p-1"
        >
          {TYPES.map((entry) => {
            const isActive = entry.value === type;
            return (
              <button
                key={entry.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setType(entry.value);
                  setActionError(null);
                }}
                className={cn(
                  "min-h-9 rounded-full px-4 text-label font-semibold transition-colors duration-[var(--duration-fast)]",
                  isActive ? "bg-surface text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                {entry.label}
              </button>
            );
          })}
        </div>

        {active.dated ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-[11rem]">
              <Input
                label="From"
                type="date"
                value={range.from}
                max={range.to || undefined}
                onChange={(event) =>
                  setRange((current) => ({ ...current, from: event.target.value }))
                }
              />
            </div>
            <div className="w-[11rem]">
              <Input
                label="To"
                type="date"
                value={range.to}
                min={range.from || undefined}
                onChange={(event) =>
                  setRange((current) => ({ ...current, to: event.target.value }))
                }
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRange(defaultRange())}
            >
              Last 30 days
            </Button>
          </div>
        ) : (
          <p className="text-caption text-fg-muted">
            This report is a snapshot of the catalog right now, so the date range does not
            apply.
          </p>
        )}
      </div>

      <div className="hidden print:block">
        <p className="text-caption font-semibold text-fg-muted uppercase">AgriMart</p>
        <h3 className="text-heading-sm text-fg">{active.label} report</h3>
        {active.dated ? (
          <p className="text-caption text-fg-muted tabular-nums">
            {range.from || "start"} to {range.to || "today"}
          </p>
        ) : null}
      </div>

      {invalidRange ? (
        <p role="alert" className="rounded-md bg-danger-subtle p-3 text-body-sm text-danger-text">
          The start of the range has to come before the end.
        </p>
      ) : null}

      {actionError ? (
        <p role="alert" className="rounded-md bg-danger-subtle p-3 text-body-sm text-danger-text">
          {actionError}
        </p>
      ) : null}

      {report.error ? <ErrorNotice error={report.error} onRetry={report.reload} /> : null}
      {report.loading && rows.length === 0 ? <LoadingLines rows={5} /> : null}

      {!report.loading && !report.error && !invalidRange && rows.length === 0 ? (
        <EmptyState
          title="Nothing in this report"
          body="Try a wider date range, or place an order to give the report something to total."
        />
      ) : null}

      {rows.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-8">
            {summary.map((item) => (
              <div key={item.label} className="flex flex-col gap-1">
                <span className="text-caption font-semibold text-fg-muted uppercase">
                  {item.label}
                </span>
                <span className="text-heading-md text-fg tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>

          <AdminTable
            columns={columns.map((column) => ({
              label: column.label,
              align: column.align,
            }))}
          >
            {rows.map((row, index) => (
              <Row key={`${type}-${index}`} index={index}>
                {columns.map((column) => (
                  <Cell
                    key={column.label}
                    align={column.align}
                    className={column.align === "right" ? "tabular-nums" : undefined}
                  >
                    {column.value(row)}
                  </Cell>
                ))}
              </Row>
            ))}
          </AdminTable>

          <p className="flex items-center gap-2 text-caption text-fg-subtle">
            <ChartBar size={14} aria-hidden="true" />
            {rows.length} row{rows.length === 1 ? "" : "s"} from GET /reports/{type}
          </p>
        </>
      ) : null}
    </div>
  );
}
