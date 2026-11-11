import { AnimatePresence, m } from "motion/react";
import { WifiSlash } from "@phosphor-icons/react";
import { duration, ease } from "@/styles/tokens/motion.js";
import { useOnline } from "@/lib/useOnline.js";

/* designtokens 15. Full width, --bg-warm, --warning-text, WifiSlash, height morph.
   It dismisses itself the moment the connection returns (DR-A2: offline is always
   visible and no action may look like it succeeded). */
export default function OfflineBanner() {
  const online = useOnline();

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
          className="fixed inset-x-0 bottom-0 z-[var(--z-banner)] overflow-hidden bg-warm"
        >
          <p className="mx-auto flex min-h-[var(--control-sm)] w-full max-w-[var(--container-wide)] items-center justify-center gap-2 px-4 text-caption font-semibold text-warning-text lg:px-10">
            <WifiSlash size={16} weight="bold" aria-hidden="true" />
            You are offline. Checkout and chat are paused until the connection returns.
          </p>
        </m.div>
      )}
    </AnimatePresence>
  );
}
