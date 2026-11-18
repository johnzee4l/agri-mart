import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import {
  ChatCircleDots,
  PaperPlaneTilt,
  WifiSlash,
  X,
} from "@phosphor-icons/react";

import { api } from "@/lib/api.js";
import { useAuth } from "@/lib/auth.jsx";
import { asList } from "@/lib/format.js";
import {
  onChatMessage,
  sendChatMessage,
  subscribeTyping,
  watchConversation,
} from "@/lib/socket.js";
import { useOnline } from "@/lib/useOnline.js";
import { useSocketState } from "@/lib/useSocketState.js";
import { cn } from "@/lib/cn.js";
import ChatThread from "@/components/chat/ChatThread.jsx";
import { duration, ease } from "@/styles/tokens/motion.js";
import { onChatRequest } from "@/lib/chatBus.js";

/* FR-22. Customer chat widget. History comes from GET /chat/messages, live messages
   from the `message:new` socket event, and sends prefer the socket with a REST
   fallback so a blocked WebSocket still reaches the store. The panel sits above the
   mobile bar and stays inside the safe area on phones. */

const MAX_LENGTH = 2000;

function mergeMessages(current, incoming) {
  if (!incoming?.id) return current;
  if (current.some((message) => message.id === incoming.id)) return current;

  return [...current, incoming].sort((a, b) => {
    const left = new Date(a.created_at).getTime();
    const right = new Date(b.created_at).getTime();
    return left - right || String(a.id).localeCompare(String(b.id));
  });
}

export default function ChatBox() {
  const { profile } = useAuth();
  const online = useOnline();
  const socketState = useSocketState();
  const live = online && socketState === "connected";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [unread, setUnread] = useState(0);
  const [pendingBody, setPendingBody] = useState(null);

  const threadRef = useRef(null);
  const loadingRef = useRef(false);
  const typingRef = useRef(null);
  const typingTimer = useRef(null);
  const [storeTyping, setStoreTyping] = useState(false);

  const loadHistory = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const payload = await api.get("/chat/messages?limit=50");
      const history = asList(payload);

      setMessages((current) => {
        let next = current;
        for (const message of history) next = mergeMessages(next, message);
        return next;
      });
      setConversationId((current) => payload?.conversation?.id ?? current ?? null);
    } catch (loadError) {
      setError(loadError.message ?? "Could not load the conversation.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  /* Live messages update the thread even while the panel is closed; the badge counts
     only messages from the store. */
  useEffect(() => {
    return onChatMessage((payload) => {
      const message = payload?.message;
      if (!message?.id) return;

      setMessages((current) => mergeMessages(current, message));
      if (payload.conversation_id) setConversationId((current) => current ?? payload.conversation_id);

      if (!open && message.sender_id !== profile?.id) {
        setUnread((current) => current + 1);
      }
    });
  }, [open, profile?.id]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      loadHistory();
    }
  }, [open, loadHistory]);

  /* Without a socket (a serverless API, or a blocked WebSocket) an open thread polls so
     the store's reply still appears without a reload. */
  useEffect(() => {
    if (!open || socketState === "connected") return undefined;

    const timer = window.setInterval(loadHistory, 8000);
    return () => window.clearInterval(timer);
  }, [open, socketState, loadHistory]);

  /* Only an open thread counts as watching. A signed-in customer with the panel
     closed still gets a push for a new store reply. */
  useEffect(() => {
    if (!open || !conversationId) return undefined;

    let cancelled = false;
    let stop = null;

    watchConversation(conversationId)
      .then((unwatch) => {
        if (cancelled) unwatch();
        else stop = unwatch;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [open, conversationId]);

  /* Typing hint: sent while the composer has text, and shown for a few seconds after
     the last event so a pause mid-sentence does not flicker it off. */
  useEffect(() => {
    if (!open || !conversationId || !profile?.id) return undefined;

    const subscription = subscribeTyping(conversationId, {
      senderId: profile.id,
      onTyping: () => {
        setStoreTyping(true);
        window.clearTimeout(typingTimer.current);
        typingTimer.current = window.setTimeout(() => setStoreTyping(false), 4000);
      },
    });

    typingRef.current = subscription;

    return () => {
      subscription.stop();
      typingRef.current = null;
      window.clearTimeout(typingTimer.current);
      setStoreTyping(false);
    };
  }, [open, conversationId, profile?.id]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* Opening from elsewhere ("Ask the store", a push notification, ?chat=1). The bus
     also replays a request made before this lazily-loaded panel had mounted. */
  useEffect(() => {
    const stop = onChatRequest(() => setOpen(true));

    if (new URLSearchParams(window.location.search).get("chat") === "1") setOpen(true);

    return stop;
  }, []);

  useEffect(() => {
    if (!open) return;
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [open, messages, loading]);

  async function send(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || !online) return;

    setSending(true);
    setError(null);
    // Clear the composer at once and show the message as pending, so a slow socket
    // never looks like a dropped tap. A failure puts the text back for a retry.
    setDraft("");
    setPendingBody(body);

    try {
      let result;

      try {
        result = await sendChatMessage({ body, conversationId });
      } catch {
        // Socket unavailable or blocked: the REST route is the same save path.
        result = await api.post("/chat/messages", {
          body,
          ...(conversationId ? { conversation_id: conversationId } : {}),
        });
      }

      const message = result?.message ?? result?.data ?? result;
      if (message?.id) setMessages((current) => mergeMessages(current, message));
      if (result?.conversation_id) setConversationId(result.conversation_id);
    } catch (sendError) {
      setDraft(body);
      setError(sendError.message ?? "The message was not sent.");
    } finally {
      setPendingBody(null);
      setSending(false);
    }
  }

  function onComposerKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  const remaining = MAX_LENGTH - draft.length;

  return (
    <>
      <AnimatePresence>
        {open ? (
          <m.section
            key="panel"
            role="dialog"
            aria-label="Chat with the store"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: duration.fast, ease: ease.enter }}
            className="no-print fixed inset-x-3 bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-[var(--z-chat)] flex h-[min(32rem,62dvh)] flex-col overflow-hidden rounded-2xl bg-surface shadow-float md:inset-x-auto md:right-6 md:bottom-6 md:h-[32rem] md:w-[24rem]"
          >
            <header className="flex items-start justify-between gap-3 bg-tint px-4 py-3">
              <div className="min-w-0">
                <h2 className="text-label font-semibold text-fg">Chat with the store</h2>
                <p className="flex items-center gap-1.5 text-caption text-fg-muted">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 rounded-full",
                      live ? "bg-primary" : online ? "bg-warning-text" : "bg-danger-fill",
                    )}
                  />
                  {live
                    ? "Live · we usually reply within a few hours."
                    : !online
                      ? "Offline — messages are paused."
                      : socketState === "unavailable"
                        ? "Open now — replies refresh every few seconds."
                        : "Connecting to the store…"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors duration-[var(--duration-fast)] hover:bg-surface hover:text-fg"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div
              ref={threadRef}
              role="log"
              aria-live="polite"
              aria-busy={loading || undefined}
              className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
            >
              {loading && messages.length === 0 ? (
                <p className="text-body-sm text-fg-muted">Loading the conversation…</p>
              ) : null}

              {!loading && messages.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary-subtle">
                    <ChatCircleDots
                      size={22}
                      weight="fill"
                      className="text-primary-text"
                      aria-hidden="true"
                    />
                  </span>
                  <p className="text-label font-semibold text-fg">Ask us anything</p>
                  <p className="max-w-[28ch] text-body-sm text-fg-muted">
                    Stock, pickup or an order — the store answers here.
                  </p>
                </div>
              ) : null}

              <ChatThread
                messages={messages}
                ownId={profile?.id}
                pending={pendingBody}
              />

              {storeTyping ? (
                <p aria-live="polite" className="text-caption text-fg-subtle">
                  The store is typing…
                </p>
              ) : null}
            </div>

            <div className="border-t border-muted bg-surface px-3 py-2.5">
              {error ? (
                <p role="alert" className="mb-2 rounded-md bg-danger-subtle px-3 py-2 text-caption text-danger-text">
                  {error}
                </p>
              ) : null}

              {online ? (
                <form onSubmit={send} className="flex items-end gap-2">
                  <label htmlFor="chat-message" className="sr-only">
                    Message
                  </label>
                  <textarea
                    id="chat-message"
                    value={draft}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      if (event.target.value.trim()) typingRef.current?.sendTyping();
                    }}
                    onKeyDown={onComposerKeyDown}
                    rows={1}
                    maxLength={MAX_LENGTH}
                    placeholder="Write a message…"
                    className="max-h-28 min-h-11 flex-1 resize-none rounded-xl bg-muted px-3.5 py-2.5 text-base text-fg placeholder:text-fg-subtle focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    aria-label="Send message"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-colors duration-[var(--duration-fast)] hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-40"
                  >
                    <PaperPlaneTilt size={18} weight="fill" aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <p className="flex items-center gap-2 rounded-xl bg-warm px-3 py-2 text-caption text-warning-text">
                  <WifiSlash size={16} weight="bold" aria-hidden="true" />
                  Reconnect to send a message.
                </p>
              )}

              {remaining < 200 ? (
                <p className="mt-1 text-right text-caption text-fg-subtle tabular-nums">
                  {remaining} characters left
                </p>
              ) : null}
            </div>
          </m.section>
        ) : null}
      </AnimatePresence>

      {open ? null : (
        <m.button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={unread > 0 ? `Chat with the store, ${unread} unread` : "Chat with the store"}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: duration.fast, ease: ease.standard }}
          className="no-print fixed right-4 bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom)+0.75rem)] z-[var(--z-chat)] flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-float transition-colors duration-[var(--duration-fast)] hover:bg-primary-hover md:right-6 md:bottom-6"
        >
          <ChatCircleDots size={24} weight="fill" aria-hidden="true" />
          {unread > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-highlight px-1.5 py-0.5 text-caption font-semibold text-on-highlight tabular-nums"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </m.button>
      )}
    </>
  );
}
