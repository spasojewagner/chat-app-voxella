import { Link } from "react-router";
import { ArrowLeft, PanelRight } from "lucide-react";
import { useNow } from "../../hooks/useNow.js";
import { cn } from "../../lib/cn.js";
import { formatLastSeen } from "../../lib/format.js";
import { useChat } from "../../stores/chat.js";
import { Avatar } from "../ui/Avatar.jsx";
import { IconButton } from "../ui/Button.jsx";

export function ChatHeader({ conversation, detailsOpen, onToggleDetails }) {
  const { participant } = conversation;
  const online = useChat((s) => Boolean(s.online[participant._id]));
  const typing = useChat((s) => Boolean(s.typing[conversation._id]));
  const now = useNow();
  const blocked = conversation.blockedByMe || conversation.blockedMe;

  let subtitle = formatLastSeen(participant.lastSeenAt, now);
  if (blocked) subtitle = conversation.blockedByMe ? "Blocked" : "";
  else if (typing) subtitle = "typing…";
  else if (online) subtitle = "Online";

  return (
    <header className="flex items-center gap-2 border-b border-line px-2 py-2 md:gap-3 md:px-4">
      <Link
        to="/"
        aria-label="Back to conversations"
        className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg md:hidden"
      >
        <ArrowLeft className="size-5" />
      </Link>

      <button
        type="button"
        onClick={onToggleDetails}
        className="-my-1 flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-surface-2/60"
      >
        <Avatar name={participant.fullName} src={participant.profilePic} size="md" online={online && !blocked} />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{participant.fullName}</span>
          <span
            className={cn(
              "block truncate text-[13px]",
              typing && !blocked ? "font-medium text-accent" : online && !blocked ? "text-success" : "text-muted",
            )}
          >
            {subtitle || " "}
          </span>
        </span>
      </button>

      <IconButton label={detailsOpen ? "Hide details" : "Show details"} active={detailsOpen} onClick={onToggleDetails}>
        <PanelRight className="size-5" />
      </IconButton>
    </header>
  );
}
