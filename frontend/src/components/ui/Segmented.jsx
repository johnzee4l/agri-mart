import { m } from "motion/react";
import { cn } from "@/lib/cn.js";
import { spring } from "@/styles/tokens/motion.js";

/* Segmented control (designtokens 11, 12): track on --bg-muted, thumb is a shared
   layout pill moved by spring-snappy. The shared layout needs the domMax feature set,
   so use it inside the storefront morph layout. */
export default function Segmented({ items, value, onChange, label = "Sections", className }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full flex-nowrap items-center gap-0.5 overflow-x-auto rounded-full bg-muted p-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-1 [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={`tab-${item.value}`}
            aria-selected={active}
            aria-controls={`panel-${item.value}`}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative shrink-0 rounded-full px-2.5 py-2 font-semibold whitespace-nowrap transition-colors duration-[var(--duration-fast)] sm:px-4",
              active ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {active ? (
              <m.span
                layoutId="segmented-pill"
                transition={spring.snappy}
                className="absolute inset-0 rounded-full bg-surface"
                aria-hidden="true"
              />
            ) : null}
            <span className="relative text-caption sm:text-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
