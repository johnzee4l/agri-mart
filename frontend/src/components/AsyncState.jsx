import { Package, XCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";

/* Shared list states. Skeletons and empty states are token-driven (designtokens 11). */

export function LoadingLines({ rows = 3, className }) {
  return (
    <div className={cn("flex flex-col gap-3", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-[var(--row-h)] animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

export function ErrorNotice({ error, className, onRetry }) {
  return (
    <div
      role="alert"
      className={cn("flex items-start gap-3 rounded-md bg-danger-subtle p-4", className)}
    >
      <XCircle size={20} weight="bold" className="mt-0.5 shrink-0 text-danger-text" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-label font-semibold text-danger-text">This part is not available yet</p>
        <p className="text-body-sm text-danger-text">{error?.message ?? "The API did not answer."}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="self-start rounded-full px-3 py-1.5 text-label font-semibold text-danger-text hover:bg-danger-subtle/60"
          >
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({ title, body }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-subtle">
        <Package size={24} className="text-primary-text" aria-hidden="true" />
      </span>
      <h2 className="text-heading-sm text-fg">{title}</h2>
      {body ? <p className="max-w-[45ch] text-body-sm text-fg-muted">{body}</p> : null}
    </div>
  );
}
