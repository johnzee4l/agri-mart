import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth.jsx";
import { cn } from "@/lib/cn.js";
import { asList, formatClock, formatDate } from "@/lib/format.js";
import { connectSocket } from "@/lib/socket.js";
import { useApi } from "@/lib/useApi.js";
import { EmptyState, ErrorNotice, LoadingLines } from "../components/AsyncState.jsx";
import { ChatComposer, ChatThread } from "../components/ChatThread.jsx";

/* FR-22 (blueprint 6.3). The staff inbox: every customer conversation on the left, the
   thread on the right, both live over the socket. One socket per tab, the same one the
   stock updates use.

   `message:new` reaches the whole `staff` room, so a message for another conversation
   only refreshes the list, and a message for this one is appended once by id (the send
   ack and the room both carry it). */

export default function Chat() {
  const { profile } = useAuth();
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  const socket = useRef(null);
  const handlers = useRef(null);
  const activeId = useRef(null);

  const conversations = useApi("/chat/conversations?limit=30");
  const reloadConversations = conversations.reload;
  const rows = asList(conversations.data);
  const active = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
  const conversationId = active?.id ?? null;

  activeId.current = conversationId;

  const thread = useApi(
    conversationId ? `/chat/messages?conversation_id=${conversationId}&limit=100` : null,
  );

  useEffect(() => {
    if (!thread.data) return;
    setMessages(thread.data.data ?? []);
    setError(null);
  }, [thread.data]);

  const append = useCallback((message) => {
    setMessages((current) =>
      current.some((entry) => entry.id === message.id) ? current : [...current, message],
    );
  }, []);

  useEffect(() => {
    let activeSocket = true;
    let client = null;

    connectSocket()
      .then((connectedClient) => {
        if (!activeSocket) return;
        client = connectedClient;
        socket.current = connectedClient;
        setConnected(connectedClient.connected);

        handlers.current = {
          message: ({ message }) => {
            if (message.conversation_id === activeId.current) append(message);
            // Keeps the preview, the timestamp and the order of the inbox current.
            reloadConversations();
          },
          connect: () => setConnected(true),
          disconnect: () => {
            setConnected(false);
            setSending(false);
          },
        };

        connectedClient.on("message:new", handlers.current.message);
        connectedClient.on("connect", handlers.current.connect);
        connectedClient.on("disconnect", handlers.current.disconnect);
      })
      .catch(() => {
        if (activeSocket) setConnected(false);
      });

    return () => {
      activeSocket = false;
      socket.current = null;
      if (client && handlers.current) {
        client.off("message:new", handlers.current.message);
        client.off("connect", handlers.current.connect);
        client.off("disconnect", handlers.current.disconnect);
      }
    };
  }, [append, reloadConversations]);

  function submit(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || !conversationId) return;

    if (!socket.current?.connected) {
      setError("The socket is reconnecting. Try again in a moment.");
      return;
    }

    setSending(true);
    setError(null);

    socket.current.emit("message:send", { conversation_id: conversationId, body }, (result) => {
      setSending(false);

      if (!result?.ok) {
        setError(result?.error ?? "That message did not send.");
        return;
      }

      setDraft("");
      if (result.message) append(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-heading-sm text-fg">Chat inbox</h2>
        <p className="text-body-sm text-fg-muted">
          {rows.length} conversation{rows.length === 1 ? "" : "s"} ·{" "}
          {connected ? "live" : "reconnecting…"}
        </p>
      </div>

      {conversations.error ? (
        <ErrorNotice error={conversations.error} onRetry={conversations.reload} />
      ) : null}

      {conversations.loading && rows.length === 0 ? <LoadingLines rows={4} /> : null}

      {!conversations.loading && !conversations.error && rows.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          body="A customer's first message opens a conversation here."
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[19rem_1fr]">
          <ul aria-label="Conversations" className="flex flex-col gap-1">
            {rows.map((row) => {
              const selected = row.id === conversationId;

              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left transition-colors duration-[var(--duration-fast)]",
                      selected ? "bg-primary-subtle text-primary-text" : "text-fg hover:bg-muted",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-label font-semibold">
                        {row.customer?.full_name ?? "Customer"}
                      </span>
                      <span className="text-caption tabular-nums text-fg-subtle">
                        {row.last_message ? formatClock(row.last_message.created_at) : formatDate(row.created_at)}
                      </span>
                    </span>
                    <span className="line-clamp-1 text-caption text-fg-muted">
                      {row.last_message?.body ?? "No messages yet"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <section
            aria-label={active?.customer?.full_name ? `Chat with ${active.customer.full_name}` : "Chat"}
            className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl bg-canvas ring-1 ring-inset ring-[var(--field-edge)]"
          >
            <header className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <p className="text-label font-semibold text-fg">
                {active?.customer?.full_name ?? "Customer"}
              </p>
              {/* The shown count follows the live thread; the stored total only adds
                  something when the loaded window is smaller than the whole history. */}
              <p className="text-caption tabular-nums text-fg-muted">
                {thread.data?.total > messages.length
                  ? `${messages.length} of ${thread.data.total} messages`
                  : `${messages.length} message${messages.length === 1 ? "" : "s"}`}
              </p>
            </header>

            {thread.error ? <ErrorNotice error={thread.error} onRetry={thread.reload} /> : null}

            {thread.loading && messages.length === 0 ? (
              <div className="px-4">
                <LoadingLines rows={4} />
              </div>
            ) : (
              <ChatThread
                messages={messages}
                meId={profile?.id ?? null}
                customerId={active?.customer_id ?? null}
                emptyTitle="No messages yet"
                emptyBody="Answer first if you are picking this thread up."
              />
            )}

            {error ? (
              <p role="alert" className="px-4 pb-2 text-caption text-danger-text">
                {error}
              </p>
            ) : null}

            <ChatComposer
              value={draft}
              onChange={setDraft}
              onSubmit={submit}
              sending={sending}
              disabled={!connected}
              placeholder={connected ? "Reply to the customer" : "Connecting…"}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
