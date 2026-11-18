import { useState } from "react";
import { DownloadSimple, DeviceMobile } from "@phosphor-icons/react";

import { useInstallPrompt } from "@/lib/install.js";
import { cn } from "@/lib/cn.js";

/* FR-20. A permanent install entry in the customer's settings, because the automatic
   sheet only shows once and its prompt is easy to dismiss. Browsers that expose
   `beforeinstallprompt` get a real button; iOS has no prompt API, so it gets the Share
   sheet instruction instead of a button that would do nothing. */

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  return /iP(hone|ad|od)/.test(window.navigator.userAgent);
}

/* Electron shells (including the desktop app this preview runs in) never fire the
   install prompt, so the button has to say that instead of asking for a reload. */
function isEmbeddedBrowser() {
  return /Electron|Freebuff/i.test(window.navigator.userAgent);
}

export default function InstallAppCard({ className }) {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [installed, setInstalled] = useState(() => isStandalone());
  const [installing, setInstalling] = useState(false);
  const [hint, setHint] = useState(null);

  if (installed) return null;

  async function install() {
    setHint(null);

    if (!canInstall) {
      // iPhone never fires the prompt and some browsers need the page reloaded first.
      setHint(
        isIOS()
          ? "On iPhone or iPad, use Share → Add to Home Screen."
          : isEmbeddedBrowser()
            ? "This in-app browser cannot install web apps. Open AgriMart in Chrome or Edge to install it."
            : "Your browser has not offered the install prompt yet. Reload the page and try again.",
      );
      return;
    }

    setInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === "accepted") setInstalled(true);
      else if (outcome === "dismissed") setHint("Install is still available here any time.");
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-4 rounded-xl bg-tint px-4 py-3", className)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary-text">
          <DeviceMobile size={18} weight="fill" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-label font-semibold text-fg">Install AgriMart</p>
          <p className="text-caption text-fg-muted">
            Keeps your cart and orders on this device, and opens without the browser bar.
          </p>
          {hint ? <p className="mt-1 text-caption text-fg-subtle">{hint}</p> : null}
        </div>
      </div>

      <button
        type="button"
        onClick={install}
        disabled={installing}
        className="inline-flex h-[var(--control-md)] shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-label font-semibold text-on-primary hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-60"
      >
        <DownloadSimple size={18} weight="bold" aria-hidden="true" />
        {installing ? "Opening…" : "Install app"}
      </button>
    </div>
  );
}
