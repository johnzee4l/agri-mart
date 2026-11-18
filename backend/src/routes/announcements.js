import { Router } from "express";
import { z } from "zod";

import { crudRouter, patchOf } from "../lib/crud.js";
import { notifyAnnouncementPublished } from "../lib/pushEvents.js";
import { supabase } from "../lib/supabase.js";

/* FR-12, FR-13, FR-21. Draft and publish through published_at: null is a draft, a past
   timestamp is published. Public reads see published rows only, pinned first;
   an admin token also sees drafts. Publishing pushes to every subscribed customer. */

const publishedAt = z
  .string()
  .trim()
  .nullable()
  .optional()
  .refine((value) => value == null || !Number.isNaN(Date.parse(value)), {
    message: "Send an ISO date, or null for a draft.",
  });

const announcementBody = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(200),
  body: z.string().trim().min(1, "Write the announcement.").max(5000),
  is_pinned: z.boolean().optional(),
  published_at: publishedAt,
});

/** Live means the timestamp exists and is not in the future. */
function isPublished(row) {
  return row?.published_at != null && Date.parse(row.published_at) <= Date.now();
}

/* Pushes one notice and stamps notified_at so a scheduled sweep cannot send it a
   second time. A failed push leaves the stamp empty so the next sweep retries. */
async function announceOnce(row) {
  try {
    await notifyAnnouncementPublished(row);
  } catch (error) {
    console.error("[announcements] push failed:", error?.message ?? error);
    return false;
  }

  const { error } = await supabase()
    .from("announcements")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("notified_at", null);

  if (error) {
    console.error("[announcements] could not record the push:", error.message);
    return false;
  }

  return true;
}

/* A scheduled notice turns live while the API is running, without an admin save.
   Called at boot and once a minute from index.js; each row is pushed at most once. */
export async function sweepScheduledAnnouncements() {
  const now = new Date().toISOString();
  const { data, error } = await supabase()
    .from("announcements")
    .select("id, title, body, published_at, notified_at")
    .not("published_at", "is", null)
    .lte("published_at", now)
    .is("notified_at", null)
    .is("deleted_at", null)
    .order("published_at", { ascending: true })
    .limit(25);

  if (error) {
    console.error("[announcements] could not check scheduled notices:", error.message);
    return 0;
  }

  const rows = data ?? [];
  for (const row of rows) await announceOnce(row);
  return rows.length;
}

export const announcementsRouter = Router();

announcementsRouter.use(
  "/",
  crudRouter({
    table: "announcements",
    createSchema: announcementBody,
    updateSchema: patchOf(announcementBody),
    searchColumns: ["title", "body"],
    defaultSort: [
      { column: "is_pinned", ascending: false },
      { column: "published_at", ascending: false },
    ],
    sortable: {
      newest: { column: "published_at", ascending: false },
      oldest: { column: "published_at", ascending: true },
    },
    // Only scheduled and published rows are public; a draft has published_at null.
    publicQuery: (query) =>
      query.not("published_at", "is", null).lte("published_at", new Date().toISOString()),
    // A new announcement is a draft until published_at is supplied.
    onCreate: (req) => ({
      author_id: req.user.id,
      published_at: req.validated.body.published_at ?? null,
    }),
    // Push only when an announcement actually becomes live: a draft is silent, and
    // editing one that is already published does not notify anyone twice.
    afterCreate: (row) => {
      if (isPublished(row)) return announceOnce(row);
      return null;
    },
    afterUpdate: (row, previous) => {
      if (isPublished(row) && !isPublished(previous)) return announceOnce(row);
      return null;
    },
  }),
);
