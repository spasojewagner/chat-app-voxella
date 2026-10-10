import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "../../lib/cn.js";
import { formatDayLabel } from "../../lib/format.js";
import { buildRows } from "../../lib/messages.js";
import { useChat } from "../../stores/chat.js";
import { Avatar } from "../ui/Avatar.jsx";
import { Button } from "../ui/Button.jsx";
import { Spinner } from "../ui/Spinner.jsx";
import { MessageBubble } from "./MessageBubble.jsx";
import { TypingIndicator } from "./TypingIndicator.jsx";

const NEAR_BOTTOM = 140;
const NEAR_TOP = 160;

/**
 * Scroll rules: open at the newest message; stay pinned to the bottom while the reader is
 * there; never jump when they have scrolled up (a "new messages" button appears instead);
 * load older pages near the top without moving what is on screen.
 */
export function MessageList({ conversation }) {
  const id = conversation._id;
  const me = useChat((s) => s.me);
  const thread = useChat((s) => s.threads[id]);
  const typing = useChat((s) => Boolean(s.typing[id]));
  const messages = useMemo(() => thread?.messages ?? [], [thread?.messages]);
  const rows = useMemo(() => buildRows(messages), [messages]);

  const scroller = useRef(null);
  const pinned = useRef(true);
  const restore = useRef(null);
  const lastKey = useRef(null);
  const [showJump, setShowJump] = useState(false);
  const [unseen, setUnseen] = useState(0);

  const scrollToBottom = useCallback((behavior = "auto") => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const loadOlder = useCallback(() => {
    const el = scroller.current;
    const t = useChat.getState().threads[id];
    if (!el || !t?.loaded || t.loading || !t.hasMore) return;
    restore.current = { height: el.scrollHeight, top: el.scrollTop };
    useChat.getState().loadMessages(id, { older: true });
  }, [id]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !thread?.loaded) return;

    if (restore.current) {
      // Older messages were added above: keep the same messages under the reader's eyes.
      el.scrollTop = el.scrollHeight - restore.current.height + restore.current.top;
      restore.current = null;
      return;
    }

    const newest = messages.at(-1);
    const key = newest ? (newest.clientId ?? newest._id) : null;
    if (key === lastKey.current) return;
    const firstPaint = lastKey.current === null;
    lastKey.current = key;

    if (firstPaint || pinned.current || newest?.senderId === me) {
      scrollToBottom(firstPaint ? "auto" : "smooth");
      setUnseen(0);
    } else {
      setUnseen((n) => n + 1);
    }
  }, [messages, thread?.loaded, me, scrollToBottom]);

  // A failed or empty "load older" leaves nothing to restore.
  useEffect(() => {
    if (!thread?.loading) restore.current = null;
  }, [thread?.loading]);

  // Content can grow after it is rendered (photos finish loading, the typing bubble appears).
  // While the reader is at the bottom, follow it.
  const content = useRef(null);
  useEffect(() => {
    const el = content.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (pinned.current && !restore.current) scrollToBottom();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [thread?.loaded, scrollToBottom]);

  // A short first page may not overflow; fetch more until it does or history ends.
  useEffect(() => {
    const el = scroller.current;
    if (el && thread?.loaded && !thread.loading && thread.hasMore && el.scrollHeight <= el.clientHeight) loadOlder();
  }, [thread?.loaded, thread?.loading, thread?.hasMore, messages.length, loadOlder]);

  function onScroll() {
    const el = scroller.current;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinned.current = distance < NEAR_BOTTOM;
    setShowJump(distance > 400);
    if (pinned.current) setUnseen(0);
    if (el.scrollTop < NEAR_TOP) loadOlder();
  }

  const retry = useCallback((clientId) => useChat.getState().retry(id, clientId), [id]);
  const discard = useCallback((clientId) => useChat.getState().discard(id, clientId), [id]);
  const participant = conversation.participant;

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="chat-backdrop scroll-thin h-full overflow-y-auto px-3 pt-2 pb-4 md:px-6"
        role="log"
        aria-live="polite"
        aria-label={`Messages with ${participant.fullName}`}
      >
        {!thread?.loaded && !thread?.error && (
          <div className="grid h-full place-items-center text-muted">
            <Spinner className="size-6" />
          </div>
        )}
        {thread?.error && !thread.loaded && (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="font-medium">Couldn&apos;t load messages</p>
              <p className="mt-1 text-sm text-muted">{thread.error}</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => useChat.getState().loadMessages(id)}>
                Try again
              </Button>
            </div>
          </div>
        )}

        {thread?.loaded && (
          <div ref={content} className="mx-auto max-w-3xl">
            {thread.hasMore ? (
              <div className="flex h-10 items-center justify-center text-muted">{thread.loading && <Spinner />}</div>
            ) : (
              <div className="flex flex-col items-center px-4 pt-8 pb-6 text-center">
                <Avatar name={participant.fullName} src={participant.profilePic} size="xl" />
                <p className="mt-3 text-lg font-semibold">{participant.fullName}</p>
                <p className="mt-1 max-w-xs text-sm text-muted">
                  {messages.length
                    ? `This is the beginning of your conversation with ${participant.fullName.split(" ")[0]}.`
                    : `Say hello to ${participant.fullName.split(" ")[0]}. Messages and photos appear here as soon as they're sent.`}
                </p>
              </div>
            )}

            {rows.map((row) =>
              row.type === "day" ? (
                <div key={row.key} className="sticky top-1 z-10 my-4 flex justify-center">
                  <span className="rounded-full border border-line bg-surface/85 px-3 py-1 text-xs font-medium text-muted shadow-sm backdrop-blur">
                    {formatDayLabel(row.date)}
                  </span>
                </div>
              ) : (
                <MessageBubble
                  key={row.key}
                  message={row.message}
                  mine={row.message.senderId === me}
                  first={row.first}
                  last={row.last}
                  participant={participant}
                  onRetry={retry}
                  onDiscard={discard}
                />
              ),
            )}

            {typing && <TypingIndicator participant={participant} />}
          </div>
        )}
      </div>

      {(showJump || unseen > 0) && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className={cn(
            "absolute right-4 bottom-4 flex h-10 animate-pop-in items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-medium shadow-card",
            unseen > 0 && "text-accent",
          )}
        >
          {unseen > 0 && <span>{unseen} new</span>}
          <ArrowDown className="size-4" />
          <span className="sr-only">Scroll to the newest message</span>
        </button>
      )}
    </div>
  );
}
