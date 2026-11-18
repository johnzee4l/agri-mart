import { useEffect, useState } from "react";

/* FR-20. The browser fires beforeinstallprompt only when the app meets its
   installability rules (manifest, icons, service worker, HTTPS) and only once, usually
   before React mounts. Catching it at module scope keeps the event available to both
   the launch sheet and the permanent button in settings, instead of whichever
   component happened to be listening first. */

export const DISMISS_KEY = "agrimart.install_dismissed";

let deferred = null;
const listeners = new Set();

function notify() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Keep the event so our own button decides when to ask.
    event.preventDefault();
    deferred = event;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(deferred);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const sync = () => setPromptEvent(deferred);
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    listeners.add(sync);
    window.addEventListener("appinstalled", onInstalled);

    // An event that landed between render and this effect.
    sync();

    return () => {
      listeners.delete(sync);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!promptEvent) return null;

    try {
      await promptEvent.prompt();
    } catch {
      // The browser withdrew the prompt (already installed, policy blocked it).
      deferred = null;
      setPromptEvent(null);
      return null;
    }

    const choice = await Promise.resolve(promptEvent.userChoice).catch(() => null);

    deferred = null;
    setPromptEvent(null);
    return choice?.outcome ?? null;
  }

  return { canInstall: Boolean(promptEvent) && !installed, installed, promptInstall };
}
