import { useEffect, useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import Sheet from "./ui/Sheet.jsx";
import Button from "./ui/Button.jsx";
import { DISMISS_KEY, useInstallPrompt } from "@/lib/install.js";

/* FR-20. The install prompt is a bottom sheet (designtokens 9.3). It only appears
   once the browser reports the app as installable, and stays quiet for good once the
   customer declines. */
export default function InstallSheet() {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canInstall) return;

    let declined = null;
    try {
      declined = window.localStorage.getItem(DISMISS_KEY);
    } catch {
      // Storage blocked: treat the prompt as not declined.
    }

    if (!declined) setOpen(true);
  }, [canInstall]);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Private mode: the sheet simply comes back on the next visit.
    }
    setOpen(false);
  }

  async function install() {
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);

    if (outcome !== "dismissed") setOpen(false);
  }

  return (
    <Sheet open={open} onClose={dismiss} title="Install AgriMart">
      <div className="flex flex-col gap-4">
        <p className="text-body-md text-fg-muted">
          Add AgriMart to your home screen for a full-screen view, faster loads and order updates.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button loading={busy} onClick={install}>
            <DownloadSimple size={18} aria-hidden="true" />
            Install app
          </Button>
          <Button variant="ghost" onClick={dismiss}>
            Not now
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
