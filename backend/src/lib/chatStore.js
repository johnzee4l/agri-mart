import { ApiError } from "./errors.js";
import { userProfiles } from "./profile.js";
import { notifyChatMessage } from "./pushEvents.js";
import { emitChatMessage, roomSize } from "./realtime.js";
import { supabase } from "./supabase.js";

/* FR-22. The chat data layer shared by the Socket.IO handlers (src/chat.js) and the
   REST history routes (src/routes/chat.js). One conversation per customer, messages
   are saved before they are emitted, and the inbox never loads every message. */

export const MESSAGE_FIELDS = "id, conversation_id, sender_id, body, created_at";
export const CONVERSATION_FIELDS = "id, customer_id, last_message_at, created_at";
export const MAX_BODY = 2000;
const INBOX_LIMIT = 50;
const HISTORY_LIMIT = 50;

function validation(path, message) {
  return new ApiError(400, "Validation failed", [{ path, message }]);
}

/** A message body is plain text: trimmed, no NULs, capped at 2000 characters. */
export function cleanMessage(value) {
  const body = String(value ?? "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (!body) throw validation("body", "Write a message first.");
  if (body.length > MAX_BODY) {
    throw validation("body", `Use at most ${MAX_BODY} characters.`);
  }

  return body;
}

export async function conversationForCustomer(customerId) {
  const { data, error } = await supabase()
    .from("conversations")
    .select(CONVERSATION_FIELDS)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) throw new ApiError(500, "Could not load the conversation");
  return data ?? null;
}

export async function loadConversation(id) {
  const { data, error } = await supabase()
    .from("conversations")
    .select(CONVERSATION_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new ApiError(500, "Could not load the conversation");
  if (!data) throw new ApiError(404, "Conversation not found");
  return data;
}

/** The first customer message opens the conversation; later ones reuse it. */
export async function ensureConversation(customerId) {
  const existing = await conversationForCustomer(customerId);
  if (existing) return existing;

  const { data, error } = await supabase()
    .from("conversations")
    .insert({ customer_id: customerId })
    .select(CONVERSATION_FIELDS)
    .single();

  if (!error) return data;

  /* Two first messages can race: the unique customer_id wins in the database and the
     loser reads the row the winner created instead of failing the send. */
  const raced = await conversationForCustomer(customerId);
  if (raced) return raced;

  throw new ApiError(500, "Could not open the conversation");
}

export async function saveMessage({ conversationId, senderId, body }) {
  const clean = cleanMessage(body);

  const { data, error } = await supabase()
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body: clean })
    .select(MESSAGE_FIELDS)
    .single();

  if (error) throw new ApiError(500, "Could not save the message");

  const { error: touchError } = await supabase()
    .from("conversations")
    .update({ last_message_at: data.created_at })
    .eq("id", conversationId);

  // The message is the important row; a failed touch only affects inbox ordering.
  if (touchError) console.error("[chat] could not update last_message_at:", touchError.message);

  return data;
}

/** Newest `limit` messages, returned oldest-first so a thread renders top to bottom. */
export async function listMessages({ conversationId, before, limit = HISTORY_LIMIT }) {
  const pageSize = Math.min(Math.max(Number(limit) || HISTORY_LIMIT, 1), 100);

  let query = supabase()
    .from("messages")
    .select(MESSAGE_FIELDS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(pageSize);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw new ApiError(500, "Could not load the messages");

  return (data ?? []).reverse();
}

/* Push is a convenience and never delays the send or fails the message. A recipient
   is "watching" only when their own thread is open; merely being signed in is not
   enough, or an idle tab would silence every notification. */
export function sendChatPush({ sender, conversation, message }) {
  const recipient = sender.role === "customer" ? "staff" : "customer";
  const watchRoom = `watch:${recipient}:${conversation.id}`;

  if (roomSize(watchRoom) > 0) return;

  notifyChatMessage({ recipient, conversation, message }).catch((error) => {
    console.error("[chat] push failed:", error?.message ?? error);
  });
}

/** Saves, broadcasts, then pushes only when the other side has no live socket. */
export async function deliverMessage({ sender, conversation, body }) {
  const message = await saveMessage({
    conversationId: conversation.id,
    senderId: sender.id,
    body,
  });

  emitChatMessage({ conversation, message });
  sendChatPush({ sender, conversation, message });

  return message;
}

/** Staff inbox: customer names and the latest message per conversation. */
export async function listConversations() {
  const { data, error } = await supabase()
    .from("conversations")
    .select(CONVERSATION_FIELDS)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(INBOX_LIMIT);

  if (error) throw new ApiError(500, "Could not load the inbox");

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);

  /* One bounded read instead of one query per conversation. A busy shop still only
     needs the newest message for each row, and 500 rows covers 50 conversations with
     plenty of headroom. */
  const { data: messages, error: messageError } = await supabase()
    .from("messages")
    .select(MESSAGE_FIELDS)
    .in("conversation_id", ids)
    .order("created_at", { ascending: false })
    .limit(Math.max(rows.length * 10, 100));

  if (messageError) throw new ApiError(500, "Could not load the inbox messages");

  const latest = new Map();
  for (const message of messages ?? []) {
    if (!latest.has(message.conversation_id)) latest.set(message.conversation_id, message);
  }

  const profiles = await userProfiles(rows.map((row) => row.customer_id));

  return rows.map((row) => ({
    ...row,
    customer: profiles.get(row.customer_id) ?? null,
    last_message: latest.get(row.id) ?? null,
  }));
}
