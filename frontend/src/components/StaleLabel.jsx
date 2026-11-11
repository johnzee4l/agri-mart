import { cn } from "@/lib/cn.js";
import { formatClock } from "@/lib/format.js";
import { getLastSyncedAt, useOnline } from "@/lib/useOnline.js";

/* designtokens 15. While offline, prices and stock come from the last response the
   service worker stored, so say when that was. */
export default function StaleLabel({ className }) {
  const online = useOnline();
  if (online) return null;

  const syncedAt = getLastSyncedAt();

  return (
    <span className={cn("text-caption text-fg-muted", className)}>
      {syncedAt ? `Updated ${formatClock(syncedAt)} · offline` : "Cached copy · offline"}
    </span>
  );
}
