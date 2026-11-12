import { useCallback, useEffect, useRef, useState } from "react";
import { ChatCircleDots, X } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth.jsx";
import { cn } from "@/lib/cn.js";
import { useApi } from "@/lib/useApi.js";
import { connectSocket } from "@/lib/socket.js";
import { ChatComposer, ChatThread } from "./ChatThread.jsx";

/* FR-22 (blueprint 6.3), D8. The customer's floating chat: a 56 px launcher that opens
   into the panel (designtokens 12 and 9.3), one thread with the store.

   App.jsx mounts this only for a signed-in customer who is online, so the widget never
   has to answer "should I be here". History comes from GET /chat/messages and the live
   tail from the same socket the stock updates use; a message that arrives twice (once
   through the send ack, once through the room) is kept once, by id.

   The launcher-to-panel change runs as a CSS transition rather than a shared-layout
   morph: `layoutId` morphs need domMax, which is scoped to the storefront routes and
   does not cover this widget, which sits outside the router's layout. */

export default function ChatBox() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  const socket = useRef(null);
  const handlers = useRef(null);
  const seeded = useRef(false);

  const history = useApi(open ? "/chat/messages" : null);

  const append = useCallback((message) => {
    setMessages((current) =>
      current.some((entry) => entry.id === message.id) ? current : [...current, message],
    );
  }, []);

  // Load history once, when the panel is first opened.
  useEffect(() => {
    if (seeded.current || !history.data) return;
    seeded.current = true;
    setMessages(history.data.data ?? []);
  }, [history.data]);

  useEffect(() => {
    let active = true;
    let client = null;

    connectSocket()
      .then((connectedClient) => {
        if (!active) return;
        client = connectedClient;
        socket.current = connectedClient;
        setConnected(connectedClient.connected);

        handlers.current = {
          message: ({ message }) => append(message),
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
        if (active) setConnected(false);
      });

    return () => {
      active = false;
      socket.current = null;
      if (client && handlers.current) {
        client.off("message:new", handlers.current.message);
        client.off("connect", handlers.current.connect);
        client.off("disconnect", handlers.current.disconnect);
      }
    };
  }, [append]);

  function submit(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    if (!socket.current?.connected) {
      setError("Still connecting. Try again in a moment.");
      return;
    }

    setSending(true);
    setError(null);

    socket.current.emit("message:send", { body }, (result) => {
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
    <div className="fixed right-4 bottom-4 z-[var(--z-chat)] flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {/* Kept mounted so the open/close transition runs from a class change alone, and
          hidden with `invisible` when closed so none of it is focusable or announced. */}
      <section
        aria-label="Chat with AgriMart"
        aria-hidden={!open}
        className={cn(
          "flex flex-col overflow-hidden bg-surface shadow-float",
          "origin-bottom-right transition-[opacity,transform,visibility] duration-[var(--duration-fast)] ease-standard",
          open ? "visible scale-100 opacity-100" : "pointer-events-none invisible scale-95 opacity-0",
          "max-sm:fixed max-sm:inset-0 max-sm:h-dvh max-sm:w-full max-sm:rounded-none",
          // 380 × 560 from designtokens 12, in rem so it scales with the root size.
          "sm:h-[35rem] sm:w-[23.75rem] sm:rounded-2xl",
        )}
      >
          <header className="flex items-start justify-between gap-3 bg-primary px-4 py-3 text-on-primary">
            <div className="flex flex-col">
              <p className="text-label font-semibold">Chat with AgriMart</p>
              <p className="text-caption text-on-primary/80">
                {connected ? "Connected · we reply during store hours" : "Connecting…"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1 hover:bg-primary-hover"
            >
              <X size={20} weight="bold" aria-hidden="true" />
            </button>
          </header>

          {history.error ? (
            <p role="alert" className="px-4 py-3 text-body-sm text-danger-text">
              {history.error.message}
            </p>
          ) : null}

          <ChatThread
            messages={messages}
            meId={profile?.id ?? null}
            customerId={profile?.id ?? null}
            emptyTitle="Say hello"
            emptyBody="Ask about stock, an order, or a delivery and the store will answer here."
          />

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
            placeholder={connected ? "Write a message" : "Connecting…"}
          />
      </section>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close chat" : "Chat with the store"}
        className={cn(
          "flex size-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-float",
          "transition-[background-color,transform] duration-[var(--duration-fast)] ease-standard",
          "hover:bg-primary-hover active:bg-primary-pressed active:scale-95",
          open && "hidden sm:flex",
        )}
      >
        <ChatCircleDots size={26} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}
