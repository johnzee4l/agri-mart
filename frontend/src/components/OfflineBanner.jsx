import { AnimatePresence, m } from "motion/react";
import { WifiSlash } from "@phosphor-icons/react";
import { useLocation } from "react-router-dom";
import { duration, ease } from "@/styles/tokens/motion.js";
import { useOnline } from "@/lib/useOnline.js";
import { cn } from "@/lib/cn.js";

/* designtokens 15. Full width, --bg-warm, --warning-text, WifiSlash, height morph.
   It dismisses itself the moment the connection returns (DR-A2: offline is always
   visible and no action may look like it succeeded). On the storefront it sits above
   the mobile bar; the admin console has no bar, so it stays on the bottom edge. */
export default function OfflineBanner() {
  const online = useOnline();
  const { pathname } = useLocation();
  const aboveMobileNav = !pathname.startsWith("/admin");

  return (
    <AnimatePresence>
      {online ? null : (
        <m.div
          role="status"
          aria-live="polite"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: duration.moderate, ease: ease.standard }}
          className={cn(
            "no-print fixed inset-x-0 z-[var(--z-banner)] overflow-hidden bg-warm",
            aboveMobileNav
              ? "bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] md:bottom-0"
              : "bottom-0",
          )}
        >
          <p className="mx-auto flex min-h-[var(--control-sm)] w-full max-w-[var(--container-wide)] items-center justify-center gap-2 px-4 text-caption font-semibold text-warning-text lg:px-10">
            <WifiSlash size={16} weight="bold" aria-hidden="true" />
            You are offline. Settings changes are saved and sync later; checkout and chat
            are paused until the connection returns.
          </p>
        </m.div>
      )}
    </AnimatePresence>
  );
}
