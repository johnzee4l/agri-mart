import { useEffect, useState } from "react";

/* FR-20, designtokens 15. Connection state plus the last time a request actually
   reached the API, which is what the "Updated 14:05 · offline" label reports. */

const SYNC_KEY = "agrimart.last_sync";

let lastSyncedAt = 0;

try {
  lastSyncedAt = Number(window.sessionStorage.getItem(SYNC_KEY)) || 0;
} catch {
  // Storage can be blocked; the label then just omits the time.
}

/** Called by lib/api.js after every successful response. */
export function markSynced() {
  lastSyncedAt = Date.now();
  try {
    window.sessionStorage.setItem(SYNC_KEY, String(lastSyncedAt));
  } catch {
    // Nothing to do: the in-memory value still works for this tab.
  }
}

export function getLastSyncedAt() {
  return lastSyncedAt;
}

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
