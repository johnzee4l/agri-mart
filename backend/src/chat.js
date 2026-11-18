import {
  cleanMessage,
  conversationForCustomer,
  deliverMessage,
  ensureConversation,
  loadConversation,
} from "./lib/chatStore.js";
import { getProfile } from "./lib/profile.js";
import { supabase } from "./lib/supabase.js";

/* FR-22, blueprint 6.3. Socket.IO lives on the same server as the API (D12).
   The handshake token is verified with Supabase and re-checked against the profile,
   exactly like the REST middleware. Customers join `conv:<customerId>`; staff and
   admins join `staff`. A message is written to the database before it is emitted. */

const MESSAGE_WINDOW_MS = 10_000;
const MESSAGE_BURST = 20;

function errorMessage(error) {
  return error?.status ? error.message : "The message could not be sent.";
}

function reply(ack, payload) {
  if (typeof ack === "function") ack(payload);
}

export function initChat(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token ?? null;
    if (!token) return next(new Error("Missing access token"));

    try {
      const { data, error } = await supabase().auth.getUser(token);
      if (error || !data?.user) return next(new Error("Invalid or expired session"));

      const profile = await getProfile(data.user.id);
      if (!profile.is_active) return next(new Error("Account is deactivated"));

      socket.data.user = { ...data.user, ...profile };
      return next();
    } catch {
      return next(new Error("Could not verify the session"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    const rooms = user.role === "customer" ? [`conv:${user.id}`] : ["staff"];

    for (const room of rooms) socket.join(room);
    socket.data.messageStamps = [];
    socket.data.watchRooms = [];

    socket.emit("chat:ready", { connected: true, rooms, role: user.role });

    /* Opening a thread marks this socket as watching that conversation, which is
       what suppresses the recipient's push. Sending null leaves every watch room. */
    socket.on("conversation:watch", async (payload, ack) => {
      try {
        for (const room of socket.data.watchRooms ?? []) socket.leave(room);
        socket.data.watchRooms = [];

        const requested = payload?.conversation_id ?? null;
        if (!requested) return reply(ack, { ok: true, watching: null });

        let conversation;

        if (user.role === "customer") {
          conversation = await conversationForCustomer(user.id);
          if (!conversation || conversation.id !== requested) {
            return reply(ack, { ok: false, error: "Conversation not found." });
          }
        } else {
          conversation = await loadConversation(requested);
        }

        const role = user.role === "customer" ? "customer" : "staff";
        const room = `watch:${role}:${conversation.id}`;
        socket.join(room);
        socket.data.watchRooms = [room];

        return reply(ack, { ok: true, watching: conversation.id });
      } catch (error) {
        return reply(ack, { ok: false, error: errorMessage(error) });
      }
    });

    /* A typing hint is ephemeral: nothing is stored and nothing is acknowledged. It
       only reaches the other side of the same conversation, and the client throttles
       it to one event every couple of seconds. */
    socket.on("typing", async (payload) => {
      try {
        const requested = payload?.conversation_id ?? null;
        if (!requested) return;

        const conversation =
          user.role === "customer"
            ? await conversationForCustomer(user.id)
            : await loadConversation(requested);

        if (!conversation || conversation.id !== requested) return;

        io.to(`conv:${conversation.customer_id}`)
          .to("staff")
          .emit("typing", { conversation_id: conversation.id, sender_id: user.id });
      } catch {
        // A typing hint is never worth an error to the sender.
      }
    });

    socket.on("message:send", async (payload, ack) => {
      try {
        const now = Date.now();
        socket.data.messageStamps = (socket.data.messageStamps ?? []).filter(
          (stamp) => now - stamp < MESSAGE_WINDOW_MS,
        );
        if (socket.data.messageStamps.length >= MESSAGE_BURST) {
          return reply(ack, {
            ok: false,
            error: "You are sending messages too quickly. Wait a moment.",
          });
        }
        socket.data.messageStamps.push(now);

        const body = cleanMessage(payload?.body);
        const requested = payload?.conversation_id ?? null;

        let conversation;

        if (user.role === "customer") {
          conversation = await conversationForCustomer(user.id);
          if (!conversation) conversation = await ensureConversation(user.id);
          if (requested && requested !== conversation.id) {
            return reply(ack, { ok: false, error: "Conversation not found." });
          }
        } else {
          if (!requested) {
            return reply(ack, { ok: false, error: "Choose a conversation first." });
          }
          conversation = await loadConversation(requested);
        }

        const message = await deliverMessage({ sender: user, conversation, body });

        return reply(ack, {
          ok: true,
          data: {
            message,
            conversation_id: conversation.id,
            customer_id: conversation.customer_id,
          },
        });
      } catch (error) {
        return reply(ack, { ok: false, error: errorMessage(error) });
      }
    });
  });
}
