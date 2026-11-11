import { useEffect } from "react";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";

/* Centred dialog. Wrapper for Base UI / coss ui once D2 is confirmed (designtokens.md 11). */
export default function Dialog({ open, onClose, title, children, className }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-sheet)] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[var(--overlay)]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full max-w-[35rem] rounded-2xl bg-surface p-6 shadow-float",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-heading-sm text-fg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full p-2 text-fg-muted hover:bg-muted"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
