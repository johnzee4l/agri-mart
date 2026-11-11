import { useEffect, useState } from "react";
import { CheckCircle, Warning, XCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";
import { stockStatus } from "@/lib/catalog.js";
import { duration } from "@/styles/tokens/motion.js";

/* FR-1. Status always carries an icon and a label, never colour alone (DR-C5). */

const tones = {
  in: { label: "In stock", Icon: CheckCircle, tone: "bg-primary-subtle text-primary-text" },
  low: { label: "Low stock", Icon: Warning, tone: "bg-warning-subtle text-warning-text" },
  out: { label: "Out of stock", Icon: XCircle, tone: "bg-danger-subtle text-danger-text" },
};

export default function StockIndicator({ product, changedAt = null, className }) {
  const [flashing, setFlashing] = useState(false);

  /* Live update (designtokens 13): flash on change and announce the new value. */
  useEffect(() => {
    if (!changedAt) return undefined;
    setFlashing(true);
    const timer = window.setTimeout(() => setFlashing(false), duration.stockFlash * 1000);
    return () => window.clearTimeout(timer);
  }, [changedAt]);

  const status = stockStatus(product);
  const { label, Icon, tone } = tones[status];
  const quantity = Number(product?.stock_qty ?? 0);

  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold",
        tone,
        flashing && "animate-stock-flash",
        className,
      )}
    >
      <Icon size={16} weight="bold" aria-hidden="true" />
      {status === "low" ? `${label} · ${quantity} left` : label}
    </span>
  );
}
