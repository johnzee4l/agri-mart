import { useEffect, useState } from "react";

/* FR-20. The browser fires beforeinstallprompt only when the app meets its
   installability rules (manifest, icons, service worker, HTTPS). Capturing it lets
   our own sheet call prompt() later. */

export const DISMISS_KEY = "agrimart.install_dismissed";

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event) => {
      // Keep the event so the install button decides when to ask.
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!promptEvent) return null;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    return choice?.outcome ?? null;
  }

  return { canInstall: Boolean(promptEvent) && !installed, installed, promptInstall };
}
