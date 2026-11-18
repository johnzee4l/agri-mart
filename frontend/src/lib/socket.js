import { API_BASE_URL, getToken } from "./api.js";

/* FR-22, D6. One live channel per tab, shared by live stock and chat.

   Two transports, picked by the build:
   - Long-lived API (local dev, Render): Socket.IO on the API origin.
   - Serverless API (Vercel): Vercel functions cannot hold a WebSocket, so the tab
     subscribes to Supabase Realtime instead. The API still writes every message; RLS
     decides which rows a signed-in browser receives.

   Set VITE_REALTIME=off to skip Socket.IO; add VITE_SUPABASE_URL and
   VITE_SUPABASE_ANON_KEY to use Realtime. Without either, chat falls back to REST
   plus polling. */

export const REALTIME_ENABLED = import.meta.env.VITE_REALTIME !== "off";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const SUPABASE_REALTIME = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const useSupabase = !REALTIME_ENABLED && SUPABASE_REALTIME;

function origin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
}

/* ------------------------------------------------------------------ Socket.IO ---- */

let client = null;
let loading = null;

function getClient() {
  if (client) return Promise.resolve(client);

  if (!loading) {
    loading = import("socket.io-client").then(({ io }) => {
      client = io(origin(), { autoConnect: false });
      // A refresh can replace the token while the tab sleeps; reconnect with the new one.
      client.on("reconnect_attempt", () => {
        client.auth = { token: getToken() ?? "" };
      });
      return client;
    });
  }

  return loading;
}

/* ------------------------------------------------------- Supabase Realtime ---- */

let supabase = null;
let channel = null;
let starting = null;
let channelState = "connecting";
let lastAuthToken = null;

const chatHandlers = new Set();
const stockHandlers = new Set();
const stateHandlers = new Set();

function report(state) {
  if (channelState === state) return;
  channelState = state;
  for (const handler of stateHandlers) handler(state);
}

async function startSupabase() {
  if (channel || starting) return starting ?? Promise.resolve();

  const token = getToken();
  if (!token) {
    report("disconnected");
    return null;
  }

  starting = (async () => {
    const { createClient } = await import("@supabase/supabase-js");

    supabase ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 5 } },
    });

    /* The tab already holds the Supabase access token the API handed it at sign-in;
       Realtime authorises the subscription with that token so RLS applies per user. */
    lastAuthToken = token;
    await supabase.realtime.setAuth(token);

    channel = supabase
      .channel("agrimart-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const message = payload?.new;
          if (!message?.id) return;

          const envelope = {
            message,
            conversation_id: message.conversation_id,
            customer_id: null,
          };

          for (const handler of chatHandlers) handler(envelope);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products" },
        (payload) => {
          const product = payload?.new;
          if (!product?.id) return;

          for (const handler of stockHandlers) {
            handler({ product_id: product.id, stock_qty: product.stock_qty });
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") report("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          report("disconnected");
        }
      });

    return channel;
  })();

  try {
    return await starting;
  } catch {
    report("disconnected");
    return null;
  } finally {
    starting = null;
  }
}

/* A refresh replaces the token while the tab sleeps; hand the new one to Realtime or
   the subscription starts failing RLS after the old JWT expires. */
if (useSupabase && typeof window !== "undefined") {
  window.setInterval(() => {
    const token = getToken();
    if (!token || token === lastAuthToken) return;

    lastAuthToken = token;
    supabase?.realtime.setAuth(token);
  }, 60_000).unref?.();
}

/* --------------------------------------------------------------------- API ---- */

/** Connects with the current token. Socket.IO resolves to the shared socket;
    Supabase Realtime returns null because it is subscribed through onChatMessage. */
export async function connectSocket() {
  if (useSupabase) {
    await startSupabase();
    return null;
  }

  if (!REALTIME_ENABLED) return null;

  const token = getToken();
  if (!token) return null;

  const socket = await getClient();
  socket.auth = { token };

  if (!socket.connected) socket.connect();

  return socket;
}

export function disconnectSocket() {
  client?.disconnect();
  channel?.unsubscribe();
  channel = null;
  report("disconnected");
}

function subscribe(event, handler) {
  if (useSupabase) {
    const set = event === "stock" ? stockHandlers : chatHandlers;
    set.add(handler);
    startSupabase();
    return () => set.delete(handler);
  }

  if (!REALTIME_ENABLED) return () => {};

  const token = getToken();
  if (!token) return () => {};

  let active = true;
  let instance = null;
  let listener = null;

  connectSocket()
    .then((socket) => {
      if (!active || !socket) return;
      instance = socket;
      listener = (payload) => {
        if (active) handler(payload);
      };
      socket.on(event, listener);
    })
    .catch(() => {
      // Realtime is an enhancement; a failed client load must not break the page.
    });

  return () => {
    active = false;
    if (instance && listener) instance.off(event, listener);
  };
}

/** Subscribes to `stock { product_id, stock_qty }`. Returns an unsubscribe function. */
export function onStock(handler) {
  return subscribe("stock", handler);
}

/** Subscribes to `message:new { message, conversation_id, customer_id }`. */
export function onChatMessage(handler) {
  return subscribe("message:new", handler);
}

/**
 * Reports the live channel as "connecting", "connected", "disconnected" or
 * "unavailable", so a chat surface can say whether a reply will actually arrive rather
 * than guess from `navigator.onLine` alone.
 */
export function onSocketState(handler) {
  if (useSupabase) {
    stateHandlers.add(handler);
    handler(channelState === "connecting" ? "connecting" : channelState);
    startSupabase();
    return () => stateHandlers.delete(handler);
  }

  if (!REALTIME_ENABLED) {
    handler("unavailable");
    return () => {};
  }

  let active = true;
  let instance = null;
  const reportState = (state) => {
    if (active) handler(state);
  };

  const onConnect = () => reportState("connected");
  const onDisconnect = () => reportState("disconnected");

  connectSocket()
    .then((socket) => {
      if (!active || !socket) return;
      instance = socket;
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      reportState(socket.connected ? "connected" : "connecting");
    })
    .catch(() => reportState("disconnected"));

  return () => {
    active = false;
    if (!instance) return;
    instance.off("connect", onConnect);
    instance.off("disconnect", onDisconnect);
  };
}

/**
 * Typing hint for one conversation. Nothing is stored: with Realtime it is a
 * broadcast channel named typing:<conversation_id>, so only a page that already knows
 * that conversation id joins it, and the payload carries no content; with Socket.IO it
 * is a `typing` event the API fans out to the same two sides. Returns a sender to call
 * while the user types, and a stop function.
 */
export function subscribeTyping(conversationId, { senderId, onTyping }) {
  const noop = { sendTyping() {}, stop() {} };
  if (!conversationId) return noop;

  let stopped = false;
  let channel = null;
  let lastSent = 0;

  async function start() {
    if (useSupabase) {
      await startSupabase();
      if (!supabase || stopped) return;

      channel = supabase.channel(`typing:${conversationId}`);

      channel
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (!payload || payload.sender_id === senderId) return;
          onTyping(payload);
        })
        .subscribe();

      return;
    }

    if (!REALTIME_ENABLED) return;

    const socket = await connectSocket();
    if (!socket || stopped) return;
    channel = socket;

    channel.on("typing", (payload) => {
      if (!payload || payload.conversation_id !== conversationId) return;
      if (payload.sender_id === senderId) return;
      onTyping(payload);
    });
  }

  start().catch(() => {
    // Typing is a nicety; a channel that cannot open is not an error anywhere else.
  });

  return {
    sendTyping() {
      const now = Date.now();
      if (stopped || now - lastSent < 1500) return;
      lastSent = now;

      if (useSupabase) {
        channel?.send({
          type: "broadcast",
          event: "typing",
          payload: { sender_id: senderId },
        });
      } else if (channel) {
        channel.emit("typing", { conversation_id: conversationId });
      }
    },
    stop() {
      stopped = true;
      if (useSupabase) channel?.unsubscribe();
      else channel?.off("typing");
      channel = null;
    },
  };
}

/**
 * Tells the server which thread is on screen. Only the Socket.IO transport has a
 * server-side room; with Realtime the same job is done by opening the panel while the
 * push only fires for an offline recipient.
 */
export async function watchConversation(conversationId) {
  if (useSupabase) return () => {};

  const socket = await connectSocket();
  if (!socket) return () => {};

  socket.emit("conversation:watch", { conversation_id: conversationId ?? null });

  return () => {
    socket.emit("conversation:watch", { conversation_id: null });
  };
}

/**
 * Sends through the live channel with an acknowledgement. Realtime has no send path --
 * the API writes the message -- so callers always fall back to POST /chat/messages.
 */
export async function sendChatMessage({ body, conversationId }) {
  if (useSupabase) throw new Error("Use the REST route.");

  const socket = await connectSocket();
  if (!socket) throw new Error("Sign in to send a message.");

  if (!socket.connected) {
    await new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        socket.off("connect", onConnect);
        reject(new Error("The live connection is not ready."));
      }, 6000);

      const onConnect = () => {
        window.clearTimeout(timer);
        socket.off("connect_error", onError);
        resolve();
      };

      const onError = (error) => {
        window.clearTimeout(timer);
        socket.off("connect", onConnect);
        reject(error instanceof Error ? error : new Error("The live connection failed."));
      };

      socket.once("connect", onConnect);
      socket.once("connect_error", onError);
    });
  }

  return new Promise((resolve, reject) => {
    socket.timeout(8000).emit(
      "message:send",
      { body, ...(conversationId ? { conversation_id: conversationId } : {}) },
      (timeoutError, response) => {
        if (timeoutError) return reject(new Error("The message took too long to send."));
        if (!response?.ok) return reject(new Error(response?.error ?? "The message was not sent."));
        return resolve(response.data);
      },
    );
  });
}
