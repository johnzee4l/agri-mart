import { api } from "./api.js";

/* FR-21. Web Push (blueprint 6.3): read the VAPID public key, ask for permission,
   subscribe through the service worker registration, then POST the subscription.
   D10 owns the routes; until they answer, callers show the error instead of failing
   silently. */

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);

  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

async function getRegistration() {
  if (!pushSupported()) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export async function readSubscription() {
  const registration = await getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function enablePush() {
  if (!pushSupported()) {
    throw new Error("This browser does not support notifications.");
  }

  const registration = await getRegistration();
  if (!registration) {
    throw new Error(
      "Notifications need the installed app. Reload once it has installed, then try again.",
    );
  }

  const answer = await api.get("/push/public-key");
  const key = answer?.key ?? answer?.public_key ?? answer?.data?.key ?? null;
  if (!key) throw new Error("The store has not configured push notifications yet.");

  const permission = await window.Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications were not allowed on this device.");
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    }));

  await api.post("/push/subscribe", subscription.toJSON());
  return subscription;
}

export async function disablePush() {
  const subscription = await readSubscription();
  if (!subscription) return;

  await api.post("/push/unsubscribe", { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
}
