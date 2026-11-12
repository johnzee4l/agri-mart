import { cn } from "@/lib/cn.js";
import Button from "../components/ui/Button.jsx";

/* One table shell for every admin list (designtokens 8.4 and 11): no borders at all,
   zebra rows on --bg-muted, compact 40 px rows, and the table scrolls inside its own
   region instead of pushing the page sideways. Status badges, stock indicators and
   action buttons are content, not chrome, so they stay in the page. */

export function AdminTable({ columns, children, className }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-separate border-spacing-0 text-body-sm">
        <thead>
          <tr className="text-caption font-semibold text-fg-muted uppercase">
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={cn(
                  "pb-2 whitespace-nowrap",
                  column.align === "right" ? "text-right" : "text-left",
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Alternating fill is applied here so no page has to remember which index is striped. */
export function Row({ index, children }) {
  return (
    <tr
      className={cn(
        "[&>td:first-child]:rounded-l-md [&>td:last-child]:rounded-r-md",
        index % 2 === 1 && "bg-muted",
      )}
    >
      {children}
    </tr>
  );
}

export function Cell({ align = "left", className, children, colSpan }) {
  return (
    <td
      colSpan={colSpan}
      className={cn("h-[var(--row-h)] px-3", align === "right" && "text-right", className)}
    >
      {children}
    </td>
  );
}

/** Hidden on a single page of results, where the control would say nothing useful. */
export function Pagination({ page, total, limit, onPage }) {
  const lastPage = Math.max(1, Math.ceil(total / limit));
  if (lastPage <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4">
      <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <span className="text-caption text-fg-muted">
        Page {page} of {lastPage}
      </span>
      <Button
        size="sm"
        variant="ghost"
        disabled={page >= lastPage}
        onClick={() => onPage(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
