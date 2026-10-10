import { sameDay } from "./format.js";

const CLUSTER_GAP = 5 * 60_000;

/**
 * Turns a flat, oldest-first message list into render rows: a separator for every new day,
 * and messages tagged with their place in a cluster (consecutive messages from one person
 * within five minutes), which decides the bubble corners and where the avatar goes.
 */
export function buildRows(messages) {
  const rows = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];

    if (!prev || !sameDay(prev.createdAt, message.createdAt)) {
      rows.push({ type: "day", key: `day-${message.createdAt}`, date: message.createdAt });
    }

    const joinsPrev = prev && continues(prev, message);
    const joinsNext = next && continues(message, next);
    rows.push({
      type: "message",
      key: message.clientId ?? message._id,
      message,
      first: !joinsPrev,
      last: !joinsNext,
    });
  }
  return rows;
}

function continues(a, b) {
  return (
    String(a.senderId) === String(b.senderId) &&
    sameDay(a.createdAt, b.createdAt) &&
    new Date(b.createdAt) - new Date(a.createdAt) < CLUSTER_GAP
  );
}

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*\s*){1,3}$/u;

/** Up to three emoji and nothing else: shown large, without a bubble. */
export function isEmojiOnly(text) {
  return Boolean(text) && EMOJI_ONLY.test(text.trim());
}

const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

/** Splits text into plain parts and links. */
export function linkify(text) {
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    if (match.index > last) parts.push({ type: "text", value: text.slice(last, match.index) });
    parts.push({ type: "link", value: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

export function previewText(lastMessage) {
  if (!lastMessage) return "";
  if (lastMessage.text) return lastMessage.text;
  return lastMessage.hasImage ? "Photo" : "";
}
