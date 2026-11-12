import { useEffect, useId, useRef } from "react";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";
import { formatClock } from "@/lib/format.js";
import Button from "./ui/Button.jsx";

/* One thread renderer for both sides of FR-22. Bubbles are coloured by who wrote them,
   not by who is reading: the customer is always --primary and the store is always
   --bg-muted (designtokens 12), so two staff on the inbox see the same thread the
   customer sees. Alignment follows the reader, so your own messages sit on the right.

   New messages are announced politely (designtokens 15, DR-A3) and the list keeps
   itself scrolled to the newest line. */

export function ChatThread({ messages, meId, customerId, emptyTitle, emptyBody }) {
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-label font-semibold text-fg">{emptyTitle}</p>
        {emptyBody ? <p className="max-w-[34ch] text-body-sm text-fg-muted">{emptyBody}</p> : null}
      </div>
    );
  }

  return (
    <ol aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
      {messages.map((message) => {
        const fromCustomer = message.sender_id === customerId;
        const mine = message.sender_id === meId;

        return (
          <li
            key={message.id}
            className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}
          >
            <p
              className={cn(
                "max-w-[85%] px-3.5 py-2.5 text-body-sm break-words whitespace-pre-wrap",
                fromCustomer ? "bg-primary text-on-primary" : "bg-muted text-fg",
                mine ? "rounded-xl rounded-br-sm" : "rounded-xl rounded-bl-sm",
              )}
            >
              {message.body}
            </p>
            <span className="text-caption tabular-nums text-fg-subtle">
              {mine ? "You · " : ""}
              {formatClock(message.created_at)}
            </span>
          </li>
        );
      })}
      <li ref={bottom} aria-hidden="true" />
    </ol>
  );
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  sending = false,
  disabled = false,
  placeholder = "Write a message",
}) {
  const id = useId();

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 px-3 pb-3">
      <label htmlFor={id} className="sr-only">
        Message
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={2000}
        className="h-[var(--control-md)] min-w-0 flex-1 rounded-full bg-muted px-4 text-base text-fg placeholder:text-fg-subtle"
      />
      <Button
        type="submit"
        size="sm"
        loading={sending}
        disabled={disabled || value.trim().length === 0}
        aria-label="Send message"
      >
        <PaperPlaneRight size={18} weight="bold" aria-hidden="true" />
      </Button>
    </form>
  );
}
