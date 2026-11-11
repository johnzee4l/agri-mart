import { Check } from "@phosphor-icons/react";
import { ORDER_FLOW, ORDER_STATUSES, PICKUP_FLOW } from "@/lib/orders.js";
import { cn } from "@/lib/cn.js";

/* FR-8. Order status tracker (designtokens 9.3, 11): dots morph to checks as the
   order advances. Pickup orders skip out_for_delivery. Cancelled orders stop here. */
export default function OrderTracker({ status, fulfillment }) {
  if (status === "cancelled") {
    return (
      <p className="text-caption text-danger-text">
        Cancelled. This order will not be fulfilled.
      </p>
    );
  }

  const steps = fulfillment === "pickup" ? PICKUP_FLOW : ORDER_FLOW;
  const current = Math.max(0, steps.indexOf(status));

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1" aria-label="Order progress">
      {steps.map((step, index) => {
        const complete = index < current || (index === current && step === "completed");
        const active = index === current && step !== "completed";

        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full transition-colors duration-[var(--duration-fast)]",
                complete && "bg-primary text-on-primary",
                active && "bg-primary-subtle text-primary-text ring-2 ring-primary",
                !complete && !active && "bg-muted text-fg-muted",
              )}
            >
              {complete ? <Check size={12} weight="bold" aria-hidden="true" /> : null}
            </span>
            <span
              className={cn(
                "text-caption",
                active ? "font-semibold text-fg" : "text-fg-muted",
              )}
            >
              {ORDER_STATUSES[step]?.label ?? step}
            </span>
            {index < steps.length - 1 ? (
              <span
                className={cn("h-0.5 w-4 rounded-full", complete ? "bg-primary" : "bg-muted")}
                aria-hidden="true"
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
