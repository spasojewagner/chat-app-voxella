import { memo } from "react";
import { Link } from "react-router";
import { Ban, Check, CheckCheck, Image } from "lucide-react";
import { cn } from "../../lib/cn.js";
import { formatListTime } from "../../lib/format.js";
import { useChat } from "../../stores/chat.js";
import { Avatar } from "../ui/Avatar.jsx";

export const ConversationItem = memo(function ConversationItem({ conversation, active, online, typing }) {
  const me = useChat((s) => s.me);
  const { participant, lastMessage, unreadCount } = conversation;
  const mine = lastMessage && lastMessage.senderId === me;
  const unread = unreadCount > 0;
  const blocked = conversation.blockedByMe || conversation.blockedMe;

  return (
    <Link
      to={`/c/${conversation._id}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors",
        active ? "bg-accent-soft" : "hover:bg-surface-2",
      )}
    >
      <Avatar name={participant.fullName} src={participant.profilePic} size="md" online={online && !blocked} />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate text-[15px]", unread ? "font-semibold" : "font-medium")}>{participant.fullName}</span>
          {lastMessage && (
            <time
              dateTime={lastMessage.createdAt}
              className={cn("shrink-0 text-xs tabular-nums", unread ? "font-semibold text-accent" : "text-faint")}
            >
              {formatListTime(lastMessage.createdAt)}
            </time>
          )}
        </span>

        <span className="mt-0.5 flex items-center gap-2">
          <span className={cn("flex min-w-0 flex-1 items-center gap-1 text-[13.5px]", unread ? "text-fg" : "text-muted")}>
            {typing ? (
              <span className="font-medium text-accent">typing…</span>
            ) : blocked ? (
              <span className="flex items-center gap-1 text-faint">
                <Ban className="size-3.5" /> {conversation.blockedByMe ? "Blocked" : "Unavailable"}
              </span>
            ) : lastMessage ? (
              <>
                {mine &&
                  (lastMessage.seen ? (
                    <CheckCheck className="size-4 shrink-0 text-accent" aria-label="Seen" />
                  ) : (
                    <Check className="size-4 shrink-0 text-faint" aria-label="Sent" />
                  ))}
                {lastMessage.hasImage && <Image className="size-3.5 shrink-0" aria-hidden="true" />}
                <span className="truncate">{lastMessage.text || (lastMessage.hasImage ? "Photo" : "")}</span>
              </>
            ) : (
              <span className="text-faint">Say hello 👋</span>
            )}
          </span>
          {unread && (
            <span
              className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-fg tabular-nums"
              aria-label={`${unreadCount} unread`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </span>
      </span>
    </Link>
  );
});
