const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);

const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" });
const shortWeekday = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const fullDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** 14:05 */
export function formatTime(value) {
  return time.format(new Date(value));
}

/** Timestamp in the conversation list: time today, then Yesterday, weekday, date. */
export function formatListTime(value, now = new Date()) {
  const date = new Date(value);
  const days = daysBetween(date, now);
  if (days <= 0) return time.format(date);
  if (days === 1) return "Yesterday";
  if (days < 7) return shortWeekday.format(date);
  return date.getFullYear() === now.getFullYear() ? dayMonth.format(date) : fullDate.format(date);
}

/** Separator between days in a conversation. */
export function formatDayLabel(value, now = new Date()) {
  const date = new Date(value);
  const days = daysBetween(date, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return weekday.format(date);
  return date.getFullYear() === now.getFullYear()
    ? `${weekday.format(date)}, ${dayMonth.format(date)}`
    : fullDate.format(date);
}

/** "last seen 5 minutes ago" */
export function formatLastSeen(value, now = new Date()) {
  if (!value) return "Offline";
  const date = new Date(value);
  const minutes = Math.floor((now - date) / MINUTE);
  if (minutes < 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes} min ago`;
  const days = daysBetween(date, now);
  if (days === 0) return `Last seen today at ${time.format(date)}`;
  if (days === 1) return `Last seen yesterday at ${time.format(date)}`;
  if (days < 7) return `Last seen ${weekday.format(date)}`;
  return `Last seen ${dayMonth.format(date)}`;
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts.at(-1)[0] : "")).toUpperCase();
}

export function sameDay(a, b) {
  return daysBetween(a, b) === 0;
}
