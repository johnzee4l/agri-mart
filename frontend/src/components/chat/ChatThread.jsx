import { cn } from "@/lib/cn.js";
import { formatClock, formatDate } from "@/lib/format.js";

/* One thread renderer for both chat surfaces (storefront panel and admin inbox), so a
   message reads the same wherever it is answered. Day separators and run-grouping
   keep a long thread scannable: consecutive messages from the same person within five
   minutes sit tighter and carry one timestamp at the end of the run. */

const RUN_WINDOW_MS = 5 * 60 * 1000;

const dayKeyFormat = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila" });

function dayKey(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dayKeyFormat.format(date);
}

function dayLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  if (dayKey(date) === dayKey(today)) return "Today";

  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  if (dayKey(date) === dayKey(yesterday)) return "Yesterday";

  return formatDate(date);
}

function continuesRun(previous, message) {
  if (!previous || previous.sender_id !== message.sender_id) return false;
  if (dayKey(previous.created_at) !== dayKey(message.created_at)) return false;

  const gap = new Date(message.created_at).getTime() - new Date(previous.created_at).getTime();
  return gap >= 0 && gap < RUN_WINDOW_MS;
}

export default function ChatThread({ messages, ownId, pending = null, className }) {
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {messages.map((message, index) => {
        const previous = messages[index - 1] ?? null;
        const next = messages[index + 1] ?? null;

        const own = message.sender_id === ownId;
        const grouped = continuesRun(previous, message);
        const endsRun = !next || !continuesRun(message, next);
        const newDay = dayKey(previous?.created_at ?? "") !== dayKey(message.created_at);

        return (
          <li
            key={message.id}
            className={cn(
              "flex flex-col gap-3",
              newDay && index > 0 ? "pt-1" : grouped && "-mt-2",
            )}
          >
            {newDay ? (
              <span className="self-center rounded-full bg-muted px-3 py-0.5 text-caption font-semibold text-fg-muted">
                {dayLabel(message.created_at)}
              </span>
            ) : null}

            <div className={cn("flex flex-col gap-1", own ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2 text-body-sm whitespace-pre-wrap break-words",
                  own ? "rounded-br-md bg-primary text-on-primary" : "rounded-bl-md bg-muted text-fg",
                )}
              >
                {message.body}
              </div>
              {endsRun ? (
                <span className="px-1 text-caption text-fg-subtle tabular-nums">
                  {formatClock(message.created_at)}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}

      {pending ? (
        <li className="flex flex-col items-end gap-1">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary/60 px-3.5 py-2 text-body-sm whitespace-pre-wrap break-words text-on-primary">
            {pending}
          </div>
          <span className="px-1 text-caption text-fg-subtle">Sending…</span>
        </li>
      ) : null}
    </ul>
  );
}
