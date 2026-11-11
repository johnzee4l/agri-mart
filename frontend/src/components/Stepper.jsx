import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";

/* Checkout stepper (designtokens 11, 12): line fill and dot-to-check morph, one step
   on canvas at a time. Earlier steps are reachable; later ones are not. */
export default function Stepper({ steps, current, onSelect }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;

        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => done && onSelect?.(index)}
              disabled={!done}
              aria-current={active ? "step" : undefined}
              className="flex items-center gap-2 text-left disabled:cursor-default"
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-caption font-semibold transition-colors duration-[var(--duration-fast)]",
                  done && "bg-primary text-on-primary",
                  active && "bg-primary-subtle text-primary-text ring-2 ring-primary",
                  !done && !active && "bg-muted text-fg-muted",
                )}
              >
                {done ? <Check size={16} weight="bold" aria-hidden="true" /> : index + 1}
              </span>
              <span className={cn("text-label", active ? "font-semibold text-fg" : "text-fg-muted")}>
                {label}
              </span>
            </button>

            {index < steps.length - 1 ? (
              <span
                className={cn(
                  "hidden h-0.5 flex-1 rounded-full sm:block",
                  done ? "bg-primary" : "bg-muted",
                )}
                aria-hidden="true"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
