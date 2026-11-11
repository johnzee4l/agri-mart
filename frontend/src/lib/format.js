/* Display formatting (designtokens.md 6.3). Prices and counts use tabular numerals
   in the components; these helpers only produce the strings. */

const php = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const manilaDate = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeZone: "Asia/Manila",
});

export function formatPHP(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? php.format(amount) : "—";
}

export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : manilaDate.format(date);
}

/** List endpoints answer { data, page, total }; detail endpoints answer the row. */
export function asList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload.data) ? payload.data : [];
}

const manilaClock = new Intl.DateTimeFormat("en-PH", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Manila",
});

/** "14:05" in Manila time, used by the offline "Updated ..." caption. */
export function formatClock(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : manilaClock.format(date);
}

export function unwrap(payload) {
  if (!payload) return null;
  return payload.data ?? payload;
}
