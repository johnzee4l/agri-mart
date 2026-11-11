import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";

/* Filter chip. Selection is never signalled by colour alone (DR-C5). */
export default function Chip({ selected = false, children, className, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-[var(--control-sm)] items-center gap-1.5 rounded-full px-3.5 text-body-sm font-semibold",
        "transition-colors duration-[var(--duration-fast)] ease-standard",
        selected ? "bg-primary-subtle text-primary-text" : "bg-muted text-fg hover:bg-muted/70",
        className,
      )}
      {...rest}
    >
      {selected ? <Check size={16} weight="bold" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
