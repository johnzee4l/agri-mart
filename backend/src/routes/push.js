import { Router } from "express";
import { z } from "zod";

import { ApiError } from "../lib/errors.js";
import { supabase } from "../lib/supabase.js";
import { auth, validate } from "../middleware.js";
import { pushConfigured } from "../lib/push.js";

/* FR-21. The browser reads the VAPID public key, asks for permission, subscribes
   through the service worker and posts the subscription here. Any signed-in account
   may manage its own subscriptions; the endpoint is unique, so re-subscribing the
   same browser moves it to whichever account signed in last. */

export const pushRouter = Router();

pushRouter.use(auth);

pushRouter.get("/public-key", (_req, res) => {
  // Null, not an error: the client shows "not configured yet" from this.
  res.json({ key: process.env.VAPID_PUBLIC_KEY ?? null });
});

pushRouter.post(
  "/subscribe",
  validate({
    body: z.object({
      endpoint: z.url("That push endpoint is not valid."),
      keys: z.object({
        p256dh: z.string().min(1, "The subscription is missing its key."),
        auth: z.string().min(1, "The subscription is missing its auth secret."),
      }),
    }),
  }),
  async (req, res) => {
    if (!pushConfigured()) throw new ApiError(503, "Push notifications are not configured");

    const { endpoint, keys } = req.validated.body;

    const { data, error } = await supabase()
      .from("push_subscriptions")
      .upsert(
        { user_id: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
        { onConflict: "endpoint" },
      )
      .select("id")
      .single();

    if (error) throw new ApiError(500, "Could not save that subscription");

    res.status(201).json({ data: { id: data.id } });
  },
);

pushRouter.post(
  "/unsubscribe",
  validate({
    body: z.object({ endpoint: z.string().min(1, "Send the subscription endpoint.") }),
  }),
  async (req, res) => {
    const { error } = await supabase()
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", req.validated.body.endpoint)
      .eq("user_id", req.user.id);

    if (error) throw new ApiError(500, "Could not remove that subscription");

    res.status(204).end();
  },
);
