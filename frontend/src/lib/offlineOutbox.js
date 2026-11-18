import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "./api.js";

/* FR-20 (offline). Settings edits made without a connection are kept in this device's
   outbox and replayed when the API is reachable again. Only settings are queued —
   checkout and chat still require a live connection, because their totals and
   conversations cannot be reconciled after the fact.

   Entries carry a `key`, so editing the same field twice offline keeps the last value
   instead of replaying both. A 4xx on replay is a real rejection (for example an
   address that was archived on another device): it is dropped and reported rather
   than retried forever. */

const STORAGE_KEY = "agrimart.outbox.v1";

const listeners = new Set();
let flushing = false;

function read() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage can be full or blocked; the in-memory list still serves this tab.
  }
  for (const listener of listeners) listener(entries);
}

export function getOutbox() {
  return read();
}

export function subscribeOutbox(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearOutbox() {
  write([]);
}

/** A failed fetch (no connection, DNS, aborted) rather than an API rejection. */
export function isNetworkError(error) {
  return !window.navigator.onLine || error instanceof TypeError;
}

export function queueMutation({ key, method, path, body, label }) {
  const entries = read();
  const id = key ?? `${method} ${path}`;
  const entry = {
    id,
    method,
    path,
    body,
    label,
    queued_at: new Date().toISOString(),
  };

  const index = entries.findIndex((item) => item.id === id);
  if (index >= 0) entries[index] = entry;
  else entries.push(entry);

  write(entries);
  return entry;
}

export function dropFromOutbox(id) {
  write(read().filter((entry) => entry.id !== id));
}

/**
 * Sends now, or queues when there is no connection. Returns `{ queued, data }` so the
 * caller can say "saved on this device" instead of "saved".
 */
export async function applyMutation({ method, path, body, label, key }) {
  if (window.navigator.onLine) {
    try {
      const data =
        method === "POST"
          ? await api.post(path, body)
          : method === "PATCH"
            ? await api.patch(path, body)
            : await api.del(path);

      return { queued: false, data };
    } catch (error) {
      if (!isNetworkError(error)) throw error;
    }
  }

  queueMutation({ key, method, path, body, label });
  return { queued: true, data: null };
}

/**
 * Replays the outbox oldest first. Stops at the first network failure (the queue stays
 * intact for the next attempt); a rejected entry is dropped and reported.
 */
export async function flushOutbox() {
  if (flushing) return { synced: 0, rejected: [] };
  if (!window.navigator.onLine) return { synced: 0, rejected: [] };

  flushing = true;
  let synced = 0;
  const rejected = [];

  try {
    for (const entry of read()) {
      try {
        if (entry.method === "POST") await api.post(entry.path, entry.body);
        else if (entry.method === "PATCH") await api.patch(entry.path, entry.body);
        else await api.del(entry.path);

        synced += 1;
        write(read().filter((item) => item.id !== entry.id));
      } catch (error) {
        // No connection, or a session that needs signing in again: keep the queue for
        // a later attempt. Only a real validation/permission rejection is dropped.
        if (isNetworkError(error) || error.status === 401) break;

        rejected.push({ label: entry.label, message: error.message });
        write(read().filter((item) => item.id !== entry.id));
      }
    }
  } finally {
    flushing = false;
  }

  return { synced, rejected };
}

/** Outbox state for a settings surface: the queue, a flush, and a sync notice. */
export function useOutbox() {
  const [entries, setEntries] = useState(() => read());
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState(null);
  const syncedRef = useRef(0);

  useEffect(() => subscribeOutbox(setEntries), []);

  const sync = useCallback(async () => {
    if (!window.navigator.onLine || read().length === 0) return;

    setSyncing(true);
    const result = await flushOutbox();
    setSyncing(false);

    if (result.synced > 0) {
      syncedRef.current += result.synced;
      setNotice({
        kind: "synced",
        message: `${result.synced} change${result.synced === 1 ? "" : "s"} synced to the store.`,
      });
    }

    if (result.rejected.length > 0) {
      setNotice({
        kind: "rejected",
        message: `${result.rejected[0].label} could not be saved: ${result.rejected[0].message}`,
      });
    }
  }, []);

  useEffect(() => {
    void sync();
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
  }, [sync]);

  return { entries, pending: entries.length, syncing, notice, setNotice, sync };
}
