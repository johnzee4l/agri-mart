import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChatCircleDots,
  PaperPlaneTilt,
  WifiSlash,
} from "@phosphor-icons/react";

import { api } from "@/lib/api.js";
import { useAuth } from "@/lib/auth.jsx";
import { asList, formatClock, formatDate } from "@/lib/format.js";
import {
  onChatMessage,
  sendChatMessage,
  subscribeTyping,
  watchConversation,
} from "@/lib/socket.js";
import { useOnline } from "@/lib/useOnline.js";
import { useSocketState } from "@/lib/useSocketState.js";
import { useApi } from "@/lib/useApi.js";
import { cn } from "@/lib/cn.js";
import ChatThread from "@/components/chat/ChatThread.jsx";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import Button from "../components/ui/Button.jsx";

/* FR-22. Staff inbox and live thread. The list comes from GET /chat/conversations,
   history from GET /chat/messages, and `message:new` keeps both current. Sends use
   the socket with POST /chat/messages as the fallback. On a phone the thread replaces
   the list, with a back button to the inbox. */

const MAX_LENGTH = 2000;

function mergeMessage(current, incoming) {
  if (!incoming?.id) return current;
  if (current.some((message) => message.id === incoming.id)) return current;
  return [...current, incoming].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function customerName(conversation) {
  return conversation?.customer?.full_name?.trim() || conversation?.customer?.phone || "Unnamed account";
}

function initials(conversation) {
  const name = customerName(conversation);
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function lastSeen(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return sameDay ? formatClock(value) : formatDate(value);
}

export default function Chat() {
  const { profile } = useAuth();
  const online = useOnline();
  const socketState = useSocketState();
  const live = online && socketState === "connected";

  const inbox = useApi("/chat/conversations");
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [unread, setUnread] = useState({});
  const [pendingBody, setPendingBody] = useState(null);
  const [customerTyping, setCustomerTyping] = useState(false);
  const typingRef = useRef(null);
  const typingTimer = useRef(null);

  const threadRef = useRef(null);
  const conversationsRef = useRef([]);
  const reloadInbox = inbox.reload;

  const threadRequest = useApi(
    selectedId ? `/chat/messages?conversation_id=${encodeURIComponent(selectedId)}&limit=100` : null,
  );

  const reloadThread = threadRequest.reload;

  /* No socket (serverless API, or a blocked WebSocket): keep the inbox and the open
     thread current with periodic reads instead of the `message:new` event. */
  useEffect(() => {
    if (socketState === "connected") return undefined;

    const timer = window.setInterval(reloadInbox, 15000);
    return () => window.clearInterval(timer);
  }, [socketState, reloadInbox]);

  useEffect(() => {
    if (!selectedId || socketState === "connected") return undefined;

    const timer = window.setInterval(reloadThread, 8000);
    return () => window.clearInterval(timer);
  }, [selectedId, socketState, reloadThread]);

  useEffect(() => {
    const rows = asList(inbox.data).slice().sort((a, b) => {
      const left = new Date(a.last_message_at ?? a.created_at).getTime();
      const right = new Date(b.last_message_at ?? b.created_at).getTime();
      return right - left;
    });

    setConversations(rows);
    conversationsRef.current = rows;    // A row can disappear between reloads; never leave a stale thread open.
    setSelectedId((current) => (current && rows.some((row) => row.id === current) ? current : null));
  }, [inbox.data]);

  useEffect(() => {
    setThread([]);
    setDraft("");
    setError(null);
  }, [selectedId]);

  /* Staff suppress the customer's push only while this thread is selected and the
     tab is visible. A background inbox still receives the notification. */
  useEffect(() => {
    if (!selectedId) return undefined;

    let cancelled = false;
    let stop = null;
    let starting = false;
    let want = document.visibilityState === "visible";

    const begin = () => {
      starting = true;

      watchConversation(selectedId)
        .then((unwatch) => {
          starting = false;
          if (cancelled || !want) unwatch();
          else stop = unwatch;
        })
        .catch(() => {
          starting = false;
        });
    };

    const sync = () => {
      want = document.visibilityState === "visible";

      if (want) {
        if (!stop && !starting) begin();
      } else if (stop) {
        stop();
        stop = null;
      }
    };

    sync();
    document.addEventListener("visibilitychange", sync);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", sync);
      stop?.();
    };
  }, [selectedId]);

  /* Typing hint for the open thread, cleared a few seconds after the last event. */
  useEffect(() => {
    if (!selectedId || !profile?.id) return undefined;

    const subscription = subscribeTyping(selectedId, {
      senderId: profile.id,
      onTyping: () => {
        setCustomerTyping(true);
        window.clearTimeout(typingTimer.current);
        typingTimer.current = window.setTimeout(() => setCustomerTyping(false), 4000);
      },
    });

    typingRef.current = subscription;

    return () => {
      subscription.stop();
      typingRef.current = null;
      window.clearTimeout(typingTimer.current);
      setCustomerTyping(false);
    };
  }, [selectedId, profile?.id]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    const payload = threadRequest.data;
    if (!payload) return;
    if (payload.conversation?.id && payload.conversation.id !== selectedId) return;

    const loaded = asList(payload);
    setThread((current) => loaded.reduce((next, message) => mergeMessage(next, message), current));
  }, [threadRequest.data, selectedId]);

  useEffect(() => {
    return onChatMessage((payload) => {
      const message = payload?.message;
      if (!message?.id) return;

      const known = conversationsRef.current.some((row) => row.id === payload.conversation_id);
      if (!known) reloadInbox();

      setConversations((current) => {
        const index = current.findIndex((row) => row.id === payload.conversation_id);

        if (index === -1) return current;

        const next = current.slice();
        next[index] = {
          ...next[index],
          last_message: message,
          last_message_at: message.created_at,
        };
        next.sort((a, b) => {
          const left = new Date(a.last_message_at ?? a.created_at).getTime();
          const right = new Date(b.last_message_at ?? b.created_at).getTime();
          return right - left;
        });
        return next;
      });

      if (payload.conversation_id === selectedId) {
        setThread((current) => mergeMessage(current, message));
      } else if (message.sender_id !== profile?.id) {
        setUnread((current) => ({
          ...current,
          [payload.conversation_id]: (current[payload.conversation_id] ?? 0) + 1,
        }));
      }
    });
  }, [reloadInbox, selectedId, profile?.id]);

  useEffect(() => {
    if (!selectedId) return;
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [selectedId, thread, threadRequest.loading]);

  function choose(id) {
    setSelectedId(id);
    setUnread((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  async function send(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId || sending || !online) return;

    setSending(true);
    setError(null);
    // The reply clears the composer immediately and shows as pending until the socket
    // acknowledges it; a failure restores the text so the reply is not lost.
    setDraft("");
    setPendingBody(body);

    try {
      let result;

      try {
        result = await sendChatMessage({ body, conversationId: selectedId });
      } catch {
        result = await api.post("/chat/messages", { body, conversation_id: selectedId });
      }

      const message = result?.message ?? result?.data ?? result;
      if (message?.id) {
        setThread((current) => mergeMessage(current, message));
        setConversations((current) => {
          const next = current.map((row) =>
            row.id === selectedId
              ? { ...row, last_message: message, last_message_at: message.created_at }
              : row,
          );
          return next;
        });
      }

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

  const selected = conversations.find((row) => row.id === selectedId) ?? null;
  const remaining = MAX_LENGTH - draft.length;

  if (inbox.error && conversations.length === 0) {
    return <ErrorNotice error={inbox.error} onRetry={inbox.reload} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-heading-sm text-fg">Chat inbox</h2>
          <p className="text-body-sm text-fg-muted">
            {conversations.length === 0
              ? "Customer conversations appear here."
              : `${conversations.length} conversation${conversations.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button variant="secondary" size="sm" loading={inbox.loading} onClick={inbox.reload}>
          <ChatCircleDots size={18} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      <div className="grid min-h-[26rem] gap-3 lg:h-[calc(100dvh-12rem)] lg:max-h-[48rem] lg:grid-cols-[19rem_1fr]">
        <section
          aria-label="Conversations"
          className={cn(
            "min-h-0 flex-col overflow-hidden rounded-xl bg-muted/50",
            selectedId ? "hidden lg:flex" : "flex",
          )}
        >
          {inbox.loading && conversations.length === 0 ? (
            <div className="p-3">
              <LoadingLines rows={5} />
            </div>
          ) : null}

          {!inbox.loading && conversations.length === 0 ? (
            <EmptyState
              title="No conversations yet"
              body="When a customer sends the store a message, the thread opens here."
            />
          ) : null}

          <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-1.5">
            {conversations.map((conversation) => {
              const unreadCount = unread[conversation.id] ?? 0;
              const active = conversation.id === selectedId;

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => choose(conversation.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-[var(--duration-fast)]",
                      active ? "bg-surface text-fg" : "hover:bg-surface/70",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tint font-display text-caption font-semibold text-primary-text">
                      {initials(conversation) || "?"}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-label font-semibold text-fg">
                          {customerName(conversation)}
                        </span>
                        <span className="shrink-0 text-caption text-fg-subtle tabular-nums">
                          {lastSeen(conversation.last_message_at ?? conversation.created_at)}
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-caption text-fg-muted">
                          {conversation.last_message?.body ?? "No messages yet."}
                        </span>
                        {unreadCount > 0 ? (
                          <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-highlight px-1.5 text-caption font-semibold text-on-highlight tabular-nums">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          aria-label="Message thread"
          className={cn(
            "min-h-0 flex-col overflow-hidden rounded-xl bg-surface",
            selectedId ? "flex" : "hidden lg:flex",
          )}
        >
          {selected ? (
            <>
              <header className="flex items-center gap-2 bg-tint px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Back to conversations"
                  className="flex size-9 items-center justify-center rounded-full text-fg-muted hover:bg-surface hover:text-fg lg:hidden"
                >
                  <ArrowLeft size={18} aria-hidden="true" />
                </button>
                <span className="flex size-9 items-center justify-center rounded-full bg-surface font-display text-caption font-semibold text-primary-text">
                  {initials(selected) || "?"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label font-semibold text-fg">
                    {customerName(selected)}
                  </span>
                  <span className="block truncate text-caption text-fg-muted tabular-nums">
                    {selected.customer?.phone ?? "Customer"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-caption font-semibold text-fg-muted">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2.5 rounded-full",
                      live ? "bg-primary" : online ? "bg-warning-text" : "bg-danger-fill",
                    )}
                  />
                  {live
                    ? "Live"
                    : !online
                      ? "Offline"
                      : socketState === "unavailable"
                        ? "Auto-refresh"
                        : "Connecting"}
                </span>
              </header>

              <div
                ref={threadRef}
                role="log"
                aria-live="polite"
                aria-busy={threadRequest.loading || undefined}
                className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
              >
                {threadRequest.loading && thread.length === 0 ? (
                  <LoadingLines rows={3} />
                ) : null}

                {threadRequest.error ? (
                  <ErrorNotice error={threadRequest.error} onRetry={threadRequest.reload} />
                ) : null}

                {!threadRequest.loading && !threadRequest.error && thread.length === 0 ? (
                  <p className="m-auto max-w-[32ch] text-center text-body-sm text-fg-muted">
                    This conversation has no messages yet. Say hello to start it.
                  </p>
                ) : null}

                <ChatThread messages={thread} ownId={profile?.id} pending={pendingBody} />

                {customerTyping ? (
                  <p aria-live="polite" className="text-caption text-fg-subtle">
                    {customerName(selected)} is typing…
                  </p>
                ) : null}
              </div>

              <div className="border-t border-muted px-3 py-2.5">
                {error ? (
                  <p
                    role="alert"
                    className="mb-2 rounded-md bg-danger-subtle px-3 py-2 text-caption text-danger-text"
                  >
                    {error}
                  </p>
                ) : null}

                {online ? (
                  <form onSubmit={send} className="flex items-end gap-2">
                    <label htmlFor="admin-chat-message" className="sr-only">
                      Reply to {customerName(selected)}
                    </label>
                    <textarea
                      id="admin-chat-message"
                      value={draft}
                      onChange={(event) => {
                        setDraft(event.target.value);
                        if (event.target.value.trim()) typingRef.current?.sendTyping();
                      }}
                      onKeyDown={onComposerKeyDown}
                      rows={1}
                      maxLength={MAX_LENGTH}
                      placeholder={`Reply to ${customerName(selected)}…`}
                      className="max-h-28 min-h-11 flex-1 resize-none rounded-xl bg-muted px-3.5 py-2.5 text-base text-fg placeholder:text-fg-subtle focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || sending}
                      aria-label="Send reply"
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-40"
                    >
                      <PaperPlaneTilt size={18} weight="fill" aria-hidden="true" />
                    </button>
                  </form>
                ) : (
                  <p className="flex items-center gap-2 rounded-xl bg-warm px-3 py-2 text-caption text-warning-text">
                    <WifiSlash size={16} weight="bold" aria-hidden="true" />
                    Reconnect to reply. Customers can still leave a message and it will arrive here.
                  </p>
                )}

                {remaining < 200 ? (
                  <p className="mt-1 text-right text-caption text-fg-subtle tabular-nums">
                    {remaining} characters left
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="m-auto flex max-w-[34ch] flex-col items-center gap-3 p-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary-subtle">
                <ChatCircleDots
                  size={24}
                  weight="fill"
                  className="text-primary-text"
                  aria-hidden="true"
                />
              </span>
              <h3 className="text-heading-sm text-fg">Pick a conversation</h3>
              <p className="text-body-sm text-fg-muted">
                New messages arrive live. Selecting a thread clears its unread count.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
