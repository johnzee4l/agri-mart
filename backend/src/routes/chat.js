import { Router } from "express";

import { ApiError } from "../lib/errors.js";
import { supabase } from "../lib/supabase.js";
import { auth, requireRole } from "../middleware.js";
import { getOrCreateConversation } from "../chat.js";

/* FR-22 (blueprint 6.3). The staff inbox and the thread history. The socket handlers
   live in src/chat.js; these routes read the same two tables.

   Customers read one conversation, theirs, and it is created here on first use so the
   widget always has a thread to load. Asking for somebody else's conversation answers
   404, never 403: a 403 would confirm that the id exists. */

export const chatRouter = Router();

chatRouter.use(auth);

const STAFF_ROLES = ["admin", "staff"];
const MESSAGE_FIELDS = "id, conversation_id, sender_id, body, created_at";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function badRequest(path, message) {
  return new ApiError(400, "Validation failed", [{ path, message }]);
}

function readPaging(query, fallback = 20) {
  const page = Math.max(1, Math.floor(Number(query.page ?? 1)) || 1);
  const limit = Math.min(100, Math.max(1, Math.floor(Number(query.limit ?? fallback)) || fallback));
  return { page, limit };
}

chatRouter.get("/conversations", requireRole(...STAFF_ROLES), async (req, res) => {
  const { page, limit } = readPaging(req.query);

  const { data, error, count } = await supabase()
    .from("conversations")
    .select("id, customer_id, last_message_at, created_at", { count: "exact" })
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw new ApiError(500, "Could not load conversations");

  const rows = data ?? [];
  const conversationIds = rows.map((row) => row.id);
  const customerIds = [...new Set(rows.map((row) => row.customer_id))];

  /* `conversations.customer_id` points at auth.users, not profiles, so there is nothing
     to embed: the name and the last message are fetched and merged here. */
  const [profiles, messages] = await Promise.all([
    customerIds.length > 0
      ? supabase().from("profiles").select("id, full_name, role").in("id", customerIds)
      : Promise.resolve({ data: [] }),
    conversationIds.length > 0
      ? supabase()
          .from("messages")
          .select("conversation_id, sender_id, body, created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
          .limit(conversationIds.length * 10)
      : Promise.resolve({ data: [] }),
  ]);

  if (profiles.error || messages.error) {
    throw new ApiError(500, "Could not load conversations");
  }

  const names = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));

  // Rows arrive newest first, so the first message seen for a conversation is its last.
  const lastMessages = new Map();
  for (const message of messages.data ?? []) {
    if (!lastMessages.has(message.conversation_id)) {
      lastMessages.set(message.conversation_id, message);
    }
  }

  res.json({
    data: rows.map((row) => ({
      ...row,
      customer: names.get(row.customer_id) ?? null,
      last_message: lastMessages.get(row.id) ?? null,
    })),
    page,
    total: count ?? 0,
  });
});

chatRouter.get("/messages", async (req, res) => {
  const { page, limit } = readPaging(req.query, 50);
  const isStaff = STAFF_ROLES.includes(req.user.role);

  const requested = req.query.conversation_id ? String(req.query.conversation_id) : null;
  if (requested && !UUID.test(requested)) {
    throw badRequest("conversation_id", "That conversation id is not valid.");
  }

  let conversationId = requested;

  if (isStaff) {
    if (!requested) throw badRequest("conversation_id", "Choose a conversation.");

    const { data, error } = await supabase()
      .from("conversations")
      .select("id")
      .eq("id", requested)
      .maybeSingle();

    if (error) throw new ApiError(500, "Could not load that conversation");
    if (!data) throw new ApiError(404, "Conversation not found");
  } else {
    const own = await getOrCreateConversation(req.user.id);
    if (requested && requested !== own.id) throw new ApiError(404, "Conversation not found");
    conversationId = own.id;
  }

  const { data, error, count } = await supabase()
    .from("messages")
    .select(MESSAGE_FIELDS, { count: "exact" })
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw new ApiError(500, "Could not load messages");

  /* Newest first from the database so page 1 is the latest window, oldest first on the
     way out because a thread reads downward. */
  res.json({
    data: (data ?? []).slice().reverse(),
    page,
    total: count ?? 0,
    conversation_id: conversationId,
  });
});
