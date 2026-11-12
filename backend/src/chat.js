import { ApiError } from "./lib/errors.js";
import { getProfile } from "./lib/profile.js";
import { sendPushToRoles, sendPushToUser } from "./lib/push.js";
import { supabase } from "./lib/supabase.js";

/* FR-22 (blueprint 6.3). Socket.IO chat on the API's own port.

   The handshake carries the access token; the server verifies it with Supabase, loads
   the profile and refuses a deactivated account, so the socket has the same authority
   as the HTTP routes. Customers join `conv:<customerId>` (one conversation each) and
   staff and admins join `staff`.

   A message is written to `messages` first and only then emitted, so a client that
   receives `message:new` can trust it exists in the database and in the history call.
   The body is trimmed and capped here; the sender is always the socket's own account,
   never anything in the payload.

   Push (FR-22, blueprint 6.2): when the other side has no live socket, the message also
   goes out as a web push. It is best effort and never awaited before the ack, because a
   slow push service must not make a delivered message look undelivered. */

const MAX_BODY = 2000;
const STAFF_ROLES = ["admin", "staff"];

/** userId → { role, sockets }. Presence, not persistence: this is only used to decide
    whether a push is worth sending. */
const presence = new Map();

function addPresence(userId, role, socketId) {
  const entry = presence.get(userId) ?? { role, sockets: new Set() };
  entry.role = role;
  entry.sockets.add(socketId);
  presence.set(userId, entry);
}

function dropPresence(userId, socketId) {
  const entry = presence.get(userId);
  if (!entry) return;
  entry.sockets.delete(socketId);
  if (entry.sockets.size === 0) presence.delete(userId);
}

function isOnline(userId) {
  return presence.has(userId);
}

function anyStaffOnline() {
  return [...presence.values()].some((entry) => STAFF_ROLES.includes(entry.role));
}

function preview(body) {
  const flat = String(body).replace(/\s+/g, " ").trim();
  return flat.length > 120 ? `${flat.slice(0, 119).trimEnd()}…` : flat;
}

/** One conversation per customer, created the first time they write or open the box. */
export async function getOrCreateConversation(customerId) {
  const existing = await supabase()
    .from("conversations")
    .select("id, customer_id, last_message_at, created_at")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (existing.error) throw new ApiError(500, "Could not load that conversation");
  if (existing.data) return existing.data;

  const created = await supabase()
    .from("conversations")
    .insert({ customer_id: customerId })
    .select("id, customer_id, last_message_at, created_at")
    .single();

  if (!created.error) return created.data;

  // Two tabs can race here; the unique constraint on customer_id settles it.
  const retry = await supabase()
    .from("conversations")
    .select("id, customer_id, last_message_at, created_at")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (retry.data) return retry.data;
  throw new ApiError(500, "Could not open that conversation");
}

async function pushToStaff(customerId, body, conversationId) {
  const profile = await getProfile(customerId).catch(() => null);

  await sendPushToRoles(STAFF_ROLES, {
    title: profile?.full_name ? `Chat: ${profile.full_name}` : "New chat message",
    body: preview(body),
    url: "/admin/chat",
    tag: `chat-${conversationId}`,
  });
}

async function pushToCustomer(customerId, body, conversationId) {
  await sendPushToUser(customerId, {
    title: "AgriMart",
    body: preview(body),
    url: "/",
    tag: `chat-${conversationId}`,
  });
}

export function initChat(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token ?? null;
    if (!token) return next(new Error("unauthorized"));

    try {
      const { data, error } = await supabase().auth.getUser(token);
      if (error || !data?.user) return next(new Error("unauthorized"));

      const profile = await getProfile(data.user.id);
      if (!profile.is_active) return next(new Error("deactivated"));

      socket.data.user = {
        id: data.user.id,
        role: profile.role,
        full_name: profile.full_name,
      };

      return next();
    } catch {
      return next(new Error("unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user;
    const rooms = [];

    if (user.role === "customer") {
      // A customer's room is keyed on their account, so it exists before their first
      // message and every staff reply lands in the same place.
      try {
        const conversation = await getOrCreateConversation(user.id);
        socket.data.conversation = conversation;
      } catch (error) {
        console.error("[chat] could not open the conversation:", error?.message);
      }

      socket.join(`conv:${user.id}`);
      rooms.push(`conv:${user.id}`);
    } else if (STAFF_ROLES.includes(user.role)) {
      socket.join("staff");
      rooms.push("staff");
    } else {
      socket.disconnect(true);
      return;
    }

    addPresence(user.id, user.role, socket.id);

    socket.emit("chat:ready", {
      connected: true,
      role: user.role,
      rooms,
      conversation_id: socket.data.conversation?.id ?? null,
    });

    socket.on("message:send", (payload, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};
      sendMessage(io, socket, payload, reply);
    });

    socket.on("disconnect", () => dropPresence(user.id, socket.id));
  });
}

async function sendMessage(io, socket, payload, reply) {
  const user = socket.data.user;

  try {
    const body = String(payload?.body ?? "").trim();

    if (!body) return reply({ ok: false, error: "Type a message first." });
    if (body.length > MAX_BODY) {
      return reply({ ok: false, error: `Keep messages under ${MAX_BODY} characters.` });
    }

    let conversation;
    let customerId;

    if (user.role === "customer") {
      conversation = socket.data.conversation ?? (await getOrCreateConversation(user.id));
      customerId = user.id;
    } else {
      const requested = payload?.conversation_id ? String(payload.conversation_id) : null;
      if (!requested) return reply({ ok: false, error: "Choose the conversation to answer." });

      const { data, error } = await supabase()
        .from("conversations")
        .select("id, customer_id, last_message_at, created_at")
        .eq("id", requested)
        .maybeSingle();

      if (error) throw new ApiError(500, "Could not load that conversation");
      if (!data) return reply({ ok: false, error: "That conversation does not exist." });

      conversation = data;
      customerId = data.customer_id;
    }

    // Saved first, emitted second: a `message:new` always names a stored row.
    const { data: message, error } = await supabase()
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        body,
      })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();

    if (error) throw new ApiError(500, "Could not save that message");

    await supabase()
      .from("conversations")
      .update({ last_message_at: message.created_at })
      .eq("id", conversation.id);

    io.to(`conv:${customerId}`).emit("message:new", { message });
    io.to("staff").emit("message:new", { message });

    reply({ ok: true, message });

    const offline = user.role === "customer" ? !anyStaffOnline() : !isOnline(customerId);
    if (!offline) return;

    const delivery =
      user.role === "customer"
        ? pushToStaff(customerId, body, conversation.id)
        : pushToCustomer(customerId, body, conversation.id);

    void delivery.catch((error) => console.error("[chat] push:", error?.message));
  } catch (error) {
    console.error("[chat] send:", error?.message);
    reply({ ok: false, error: error?.message ?? "That message did not send." });
  }
}
