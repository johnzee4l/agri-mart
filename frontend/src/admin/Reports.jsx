import { useState } from "react";
import { FileCsv, Printer, Warning } from "@phosphor-icons/react";
import { API_BASE_URL, ApiError, getToken } from "@/lib/api.js";
import { cn } from "@/lib/cn.js";
import { asList, formatDate, formatPHP } from "@/lib/format.js";
import { useApi } from "@/lib/useApi.js";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import Button from "../components/ui/Button.jsx";
import Input from "../components/ui/Input.jsx";
import Segmented from "../components/ui/Segmented.jsx";
import { AdminTable, Cell, Row } from "./AdminTable.jsx";
import "./reports-print.css";

/* FR-18 (blueprint 6.6). Four reports over a date range, CSV straight from the API and
   PDF from the browser's print view (window.print + reports-print.css), so there is no
   PDF library and no second copy of the numbers: every row here is a row the API
   returned, and the download is the API's own file.

   The range only means something to `sales` and `top-products`. Inventory and low stock
   are live snapshots, so their date fields are disabled instead of implying a filter
   the API does not apply. */

const DATE_NOTE = "With no dates the API answers the last 30 days. A date on its own counts as that whole day.";

const TYPES = [
  {
    value: "sales",
    label: "Sales",
    heading: "Sales",
    dated: true,
    note: "One row per day that had sales, with the orders and the revenue booked that day.",
    empty: {
      title: "No rows for this range",
      body: "No order in the range was paid, preparing, out for delivery or completed.",
    },
  },
  {
    value: "inventory",
    label: "Inventory",
    heading: "Inventory",
    dated: false,
    note: "What is on the shelf right now, valued at the current price.",
    empty: { title: "No products", body: "Archived products are not counted here." },
  },
  {
    value: "low-stock",
    label: "Low stock",
    heading: "Low stock",
    dated: false,
    note: "Products at or below their reorder level, and how many units they are short.",
    empty: { title: "Nothing is low", body: "Every product is above its reorder level." },
  },
  {
    value: "top-products",
    label: "Top products",
    heading: "Top products",
    dated: true,
    note: "The ten products that sold the most units in the range.",
    empty: {
      title: "No rows for this range",
      body: "No product sold in the range, so there is nothing to rank.",
    },
  },
];

/* Column sets match the API's own CSV columns, so the screen, the file and the print
   view always list the same fields in the same order. */
const COLUMNS = {
  sales: [
    { label: "Day" },
    { label: "Orders", align: "right" },
    { label: "Revenue", align: "right" },
  ],
  inventory: [
    { label: "Product" },
    { label: "Price", align: "right" },
    { label: "Stock", align: "right" },
    { label: "Stock value", align: "right" },
    { label: "Reorder at", align: "right" },
  ],
  "low-stock": [
    { label: "Product" },
    { label: "Stock", align: "right" },
    { label: "Reorder at", align: "right" },
    { label: "Shortfall", align: "right" },
  ],
  "top-products": [
    { label: "Product" },
    { label: "Units", align: "right" },
    { label: "Revenue", align: "right" },
  ],
};

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** The range in words, in the terms the API reads it. */
function rangeWords(meta, filters) {
  if (!meta.dated) return "Snapshot of what is on the shelf now";

  if (filters.from && filters.to) {
    return filters.from === filters.to
      ? `${formatDate(filters.from)} · that whole day`
      : `${formatDate(filters.from)} to ${formatDate(filters.to)} · both days included in full`;
  }
  if (filters.from) return `From ${formatDate(filters.from)} to today`;
  if (filters.to) return `Up to and including ${formatDate(filters.to)}`;
  return "Last 30 days";
}

/** One sentence per report, so a printed page carries its own totals. */
function totalsFor(type, rows) {
  if (type === "sales") {
    const orders = rows.reduce((sum, row) => sum + row.orders, 0);
    const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    return `${plural(rows.length, "day")} with sales · ${plural(orders, "order")} · ${formatPHP(revenue)}`;
  }

  if (type === "inventory") {
    const value = rows.reduce((sum, row) => sum + row.stock_value, 0);
    const low = rows.filter((row) => row.low).length;
    return `${plural(rows.length, "product")} · ${formatPHP(value)} on hand at current prices · ${low} at or below the reorder level`;
  }

  if (type === "low-stock") {
    const shortfall = rows.reduce((sum, row) => sum + row.shortfall, 0);
    return `${plural(rows.length, "product")} below the reorder level · ${plural(shortfall, "unit")} short in total`;
  }

  const units = rows.reduce((sum, row) => sum + row.quantity, 0);
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  return `${plural(rows.length, "product")} · ${plural(units, "unit")} sold · ${formatPHP(revenue)}`;
}

/* The JSON wrapper always parses JSON and this answer is a file, so the download calls
   the endpoint directly with the same token and the same query the screen shows. */
async function downloadCsv(type, search) {
  const token = getToken();
  const query = search ? `${search}&format=csv` : "format=csv";
  const response = await fetch(`${API_BASE_URL}/reports/${type}?${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      payload?.error ?? `The download failed with status ${response.status}`,
      response.status,
      payload?.details,
    );
  }

  const blob = await response.blob();
  /* The header is the authority, but a cross-origin fetch only exposes it if the API
     lists Content-Disposition in exposeHeaders, so fall back to the same name the API
     builds: <type>-<today>.csv. */
  const named =
    /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ??
    `${type}-${new Date().toISOString().slice(0, 10)}.csv`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = named;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function ProductCell({ name, unit }) {
  return (
    <span className="flex flex-col">
      <span className="font-semibold text-fg">{name}</span>
      {unit ? <span className="text-caption text-fg-muted">{unit}</span> : null}
    </span>
  );
}

function ReportRow({ type, row, index }) {
  if (type === "sales") {
    return (
      <Row index={index}>
        <Cell className="text-fg">{formatDate(row.day)}</Cell>
        <Cell align="right" className="tabular-nums text-fg">
          {row.orders}
        </Cell>
        <Cell align="right" className="font-semibold tabular-nums text-fg">
          {formatPHP(row.revenue)}
        </Cell>
      </Row>
    );
  }

  if (type === "inventory") {
    return (
      <Row index={index}>
        <Cell>
          <ProductCell name={row.name} unit={row.unit} />
        </Cell>
        <Cell align="right" className="tabular-nums text-fg-muted">
          {formatPHP(row.price)}
        </Cell>
        <Cell
          align="right"
          className={cn("tabular-nums font-semibold", row.low ? "text-danger-text" : "text-fg")}
        >
          <span className="inline-flex items-center gap-1.5">
            {row.low ? <Warning size={16} weight="bold" aria-hidden="true" /> : null}
            {row.stock_qty}
            {row.low ? <span className="sr-only">at or below the reorder level</span> : null}
          </span>
        </Cell>
        <Cell align="right" className="tabular-nums text-fg">
          {formatPHP(row.stock_value)}
        </Cell>
        <Cell align="right" className="tabular-nums text-fg-muted">
          {row.reorder_level}
        </Cell>
      </Row>
    );
  }

  if (type === "low-stock") {
    return (
      <Row index={index}>
        <Cell>
          <ProductCell name={row.name} unit={row.unit} />
        </Cell>
        <Cell align="right" className="font-semibold tabular-nums text-danger-text">
          {row.stock_qty}
        </Cell>
        <Cell align="right" className="tabular-nums text-fg-muted">
          {row.reorder_level}
        </Cell>
        <Cell align="right" className="tabular-nums text-fg">
          {row.shortfall}
        </Cell>
      </Row>
    );
  }

  return (
    <Row index={index}>
      <Cell>
        <span className="font-semibold text-fg">{row.name}</span>
      </Cell>
      <Cell align="right" className="tabular-nums text-fg">
        {row.quantity}
      </Cell>
      <Cell align="right" className="font-semibold tabular-nums text-fg">
        {formatPHP(row.revenue)}
      </Cell>
    </Row>
  );
}

export default function Reports() {
  const [type, setType] = useState("sales");
  const [filters, setFilters] = useState({ from: "", to: "" });
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const meta = TYPES.find((entry) => entry.value === type) ?? TYPES[0];
  const backwards = Boolean(filters.from && filters.to && filters.from > filters.to);
  const rangeError = backwards ? "The start of the range has to come before the end." : null;

  const search = new URLSearchParams(
    meta.dated
      ? {
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {}),
        }
      : {},
  ).toString();

  const path = rangeError ? null : `/reports/${type}${search ? `?${search}` : ""}`;
  const report = useApi(path);

  const rows = asList(report.data);
  const hasRows = rows.length > 0;

  async function handleDownload() {
    setDownloadError(null);
    setDownloading(true);

    try {
      await downloadCsv(type, search);
    } catch (error) {
      setDownloadError(error);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-heading-sm text-fg">Reports</h2>
        <p className="text-body-sm text-fg-muted">{meta.note}</p>
      </div>

      <Segmented
        label="Report type"
        value={type}
        onChange={(value) => {
          setType(value);
          setDownloadError(null);
        }}
        items={TYPES.map((entry) => ({ value: entry.value, label: entry.label }))}
      />

      <div className="flex flex-wrap items-end gap-2">
        <div className="w-[11rem]">
          <Input
            label="From"
            type="date"
            disabled={!meta.dated}
            value={filters.from}
            onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
          />
        </div>

        <div className="w-[11rem]">
          <Input
            label="To"
            type="date"
            disabled={!meta.dated}
            value={filters.to}
            onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
          />
        </div>

        <Button
          variant="ghost"
          disabled={!meta.dated || (!filters.from && !filters.to)}
          onClick={() => setFilters({ from: "", to: "" })}
        >
          Clear dates
        </Button>

        <Button
          variant="secondary"
          onClick={handleDownload}
          loading={downloading}
          disabled={Boolean(rangeError)}
        >
          <FileCsv size={18} weight="bold" aria-hidden="true" />
          Download CSV
        </Button>

        <Button variant="secondary" onClick={() => window.print()} disabled={!hasRows}>
          <Printer size={18} weight="bold" aria-hidden="true" />
          Print / Save as PDF
        </Button>
      </div>

      <p className="text-caption text-fg-subtle">
        {meta.dated ? DATE_NOTE : "This report is a live snapshot, so the date range does not apply."}
      </p>

      {rangeError ? (
        <p role="alert" className="text-caption text-danger-text">
          {rangeError}
        </p>
      ) : null}

      {downloadError ? <ErrorNotice error={downloadError} /> : null}

      <div id="report-print" className="flex flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-eyebrow font-bold text-primary-text uppercase">AgriMart</p>
            <h3 className="text-heading-sm text-fg">{meta.heading} report</h3>
            <p className="text-caption text-fg-muted">{rangeWords(meta, filters)}</p>
          </div>
          {hasRows ? (
            <p className="text-caption tabular-nums text-fg-muted">{plural(rows.length, "row")}</p>
          ) : null}
        </header>

        {report.error ? <ErrorNotice error={report.error} onRetry={report.reload} /> : null}

        {!report.error && !rangeError && report.loading && !hasRows ? <LoadingLines rows={5} /> : null}

        {/* Nothing was asked of the API while the range is backwards, so the page must
            not claim the report is empty: the alert above is the whole answer. */}
        {!report.error && !rangeError && !report.loading && !hasRows ? (
          <EmptyState title={meta.empty.title} body={meta.empty.body} />
        ) : null}

        {hasRows ? (
          <>
            <p className="text-body-sm font-semibold text-fg">{totalsFor(type, rows)}</p>
            <AdminTable columns={COLUMNS[type]}>
              {rows.map((row, index) => (
                <ReportRow
                  key={row.day ?? row.name ?? index}
                  type={type}
                  row={row}
                  index={index}
                />
              ))}
            </AdminTable>
          </>
        ) : null}
      </div>
    </div>
  );
}
