import { memo } from "react";
import { AlertCircle, Check, CheckCheck, Clock3 } from "lucide-react";
import { mediaUrl } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { formatTime } from "../../lib/format.js";
import { isEmojiOnly, linkify } from "../../lib/messages.js";
import { useLightbox } from "../../stores/lightbox.js";
import { Avatar } from "../ui/Avatar.jsx";

function Status({ message }) {
  if (message.failed) return <AlertCircle className="size-3.5" aria-label="Not sent" />;
  if (message.pending) return <Clock3 className="size-3.5" aria-label="Sending" />;
  if (message.readAt) return <CheckCheck className="size-4" aria-label="Seen" />;
  return <Check className="size-4" aria-label="Sent" />;
}

function Meta({ message, mine, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] leading-none tabular-nums select-none", className)}>
      <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
      {mine && <Status message={message} />}
    </span>
  );
}

function Text({ text, mine }) {
  return linkify(text).map((part, i) =>
    part.type === "link" ? (
      <a
        key={i}
        href={part.value}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("underline underline-offset-2 break-all", mine ? "decoration-accent-fg/50" : "text-accent")}
      >
        {part.value}
      </a>
    ) : (
      <span key={i}>{part.value}</span>
    ),
  );
}

export const MessageBubble = memo(function MessageBubble({ message, mine, first, last, participant, onRetry, onDiscard }) {
  const showImage = useLightbox((s) => s.show);
  const emojiOnly = !message.image && isEmojiOnly(message.text);
  const hasText = Boolean(message.text);

  const shape = mine
    ? cn("rounded-[20px]", !first && "rounded-tr-md", !last && "rounded-br-md")
    : cn("rounded-[20px]", !first && "rounded-tl-md", !last && "rounded-bl-md");

  return (
    <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", first ? "mt-3" : "mt-0.5")}>
      {!mine && (
        <span className="w-7 shrink-0">
          {last && <Avatar name={participant.fullName} src={participant.profilePic} size="xs" />}
        </span>
      )}

      <div className={cn("flex max-w-[min(78%,520px)] flex-col", mine ? "items-end" : "items-start")}>
        {emojiOnly ? (
          <div className="px-1">
            <p className="text-[40px] leading-tight">{message.text}</p>
            <Meta message={message} mine={mine} className={cn("text-faint", mine && "float-right")} />
          </div>
        ) : (
          <div
            className={cn(
              "relative overflow-hidden",
              // With a photo, the caption wraps to the photo's width instead of stretching the bubble.
              message.image && "w-[min(308px,100%)]",
              shape,
              mine ? "bg-accent text-accent-fg" : "bg-bubble-in text-fg",
              message.pending && "opacity-80",
              message.failed && "ring-2 ring-danger/60",
            )}
          >
            {message.image && (
              <button
                type="button"
                onClick={() => showImage(message.image)}
                className="relative block w-full p-1"
                aria-label="Open photo"
              >
                <img
                  src={mediaUrl(message.image)}
                  alt=""
                  loading="lazy"
                  className="block max-h-80 w-full rounded-[16px] bg-black/5 object-cover"
                />
                {!hasText && (
                  <Meta
                    message={message}
                    mine={mine}
                    className="absolute right-3 bottom-3 rounded-full bg-black/45 px-2 py-1 text-white backdrop-blur-sm"
                  />
                )}
              </button>
            )}
            {hasText && (
              <p className="px-3.5 pt-2 pb-2 text-[15px] leading-[1.4] break-words whitespace-pre-wrap">
                <Text text={message.text} mine={mine} />
                {/* Keeps room on the last line for the time, which sits in the corner. */}
                <span className={cn("inline-block", mine ? "w-[68px]" : "w-11")} aria-hidden="true" />
                <Meta
                  message={message}
                  mine={mine}
                  className={cn("absolute right-3 bottom-2", mine ? "text-accent-fg/75" : "text-faint")}
                />
              </p>
            )}
          </div>
        )}

        {message.failed && (
          <p className="mt-1 flex items-center gap-2 text-xs text-danger">
            <span>{message.error || "Not sent."}</span>
            <button type="button" className="font-semibold hover:underline" onClick={() => onRetry(message.clientId)}>
              Retry
            </button>
            <button type="button" className="text-muted hover:underline" onClick={() => onDiscard(message.clientId)}>
              Delete
            </button>
          </p>
        )}
      </div>
    </div>
  );
});
