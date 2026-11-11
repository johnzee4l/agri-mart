import { statusIcons } from "@/styles/icons.js";
import { ORDER_STATUSES } from "@/lib/orders.js";
import { cn } from "@/lib/cn.js";

/* Status badge mapping (designtokens 11.1). Icon plus label, never colour alone. */
export default function OrderStatusBadge({ status, className }) {
  const entry = ORDER_STATUSES[status] ?? ORDER_STATUSES.pending;
  const Icon = statusIcons[status] ?? statusIcons.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold",
        entry.tone,
        className,
      )}
    >
      <Icon size={16} weight={status === "completed" ? "fill" : "bold"} aria-hidden="true" />
      {entry.label}
    </span>
  );
}
