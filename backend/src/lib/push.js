import { sendNotification, setVapidDetails } from "web-push";

import { supabase } from "./supabase.js";

/* FR-21. Web Push with VAPID (blueprint 6.2). A subscription that answers 404 or 410
   is gone for good, so it is deleted on send. Every send is best effort: push is a
   convenience, never part of whether an order or a message succeeded. */

let ready = false;

export function pushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure() {
  if (ready) return true;
  if (!pushConfigured()) return false;

  setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@agrimart.local",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  ready = true;
  return true;
}

async function deliver(subscriptions, payload) {
  if (!configure() || !subscriptions?.length) return 0;

  const body = JSON.stringify(payload);
  const dead = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
        sent += 1;
      } catch (error) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          dead.push(subscription.id);
          return;
        }
        console.error("[push]", error?.statusCode ?? "", error?.message);
      }
    }),
  );

  if (dead.length > 0) {
    await supabase().from("push_subscriptions").delete().in("id", dead);
  }

  return sent;
}

const SUBSCRIPTION_FIELDS = "id, endpoint, p256dh, auth";

export async function sendPushToUser(userId, payload) {
  if (!configure()) return 0;

  const { data, error } = await supabase()
    .from("push_subscriptions")
    .select(SUBSCRIPTION_FIELDS)
    .eq("user_id", userId);

  if (error) {
    console.error("[push] could not load subscriptions:", error.message);
    return 0;
  }

  return deliver(data, payload);
}

export async function sendPushToRoles(roles, payload) {
  if (!configure()) return 0;

  const { data: people, error } = await supabase()
    .from("profiles")
    .select("id")
    .in("role", roles)
    .eq("is_active", true);

  if (error) {
    console.error("[push] could not load recipients:", error.message);
    return 0;
  }

  const ids = (people ?? []).map((person) => person.id);
  if (ids.length === 0) return 0;

  const { data, error: subscriptionError } = await supabase()
    .from("push_subscriptions")
    .select(SUBSCRIPTION_FIELDS)
    .in("user_id", ids);

  if (subscriptionError) {
    console.error("[push] could not load subscriptions:", subscriptionError.message);
    return 0;
  }

  return deliver(data, payload);
}
