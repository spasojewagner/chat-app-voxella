import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { LogOut, Moon, Search, Settings, SquarePen, Sun, X } from "lucide-react";
import { cn } from "../../lib/cn.js";
import { useAuth } from "../../stores/auth.js";
import { useChat } from "../../stores/chat.js";
import { resolveTheme, usePreferences } from "../../stores/preferences.js";
import { Avatar } from "../ui/Avatar.jsx";
import { Button, IconButton } from "../ui/Button.jsx";
import { Logo } from "../ui/Logo.jsx";
import { Spinner } from "../ui/Spinner.jsx";
import { ConversationItem } from "./ConversationItem.jsx";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "online", label: "Online" },
];

export function Sidebar({ onNewChat, className }) {
  const { conversationId } = useParams();
  const conversations = useChat((s) => s.conversations);
  const listStatus = useChat((s) => s.listStatus);
  const online = useChat((s) => s.online);
  const typing = useChat((s) => s.typing);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const unreadTotal = useMemo(
    () => Object.values(conversations).filter((c) => c.unreadCount > 0).length,
    [conversations],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(conversations)
      .filter((c) => c.participant)
      .filter((c) => !q || c.participant.fullName.toLowerCase().includes(q))
      .filter((c) => filter !== "unread" || c.unreadCount > 0 || c._id === conversationId)
      .filter((c) => filter !== "online" || online[c.participant._id])
      .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  }, [conversations, query, filter, online, conversationId]);

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col bg-surface md:rounded-2xl md:border md:border-line md:shadow-card",
        className,
      )}
    >
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <Logo />
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <IconButton label="New message" onClick={onNewChat}>
            <SquarePen className="size-5" />
          </IconButton>
        </div>
      </header>

      <div className="px-4">
        <label className="relative block">
          <span className="sr-only">Search conversations</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-10 w-full rounded-xl bg-surface-2 pr-9 pl-9 text-[15px] outline-none placeholder:text-faint focus:ring-2 focus:ring-accent-soft"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-faint hover:text-fg"
            >
              <X className="size-4" />
            </button>
          )}
        </label>

        <div role="tablist" aria-label="Filter conversations" className="mt-3 flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              type="button"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "h-8 rounded-full px-3 text-[13px] font-medium transition-colors",
                filter === f.id ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {f.label}
              {f.id === "unread" && unreadTotal > 0 && <span className="ml-1.5 tabular-nums">{unreadTotal}</span>}
            </button>
          ))}
        </div>
      </div>

      <nav aria-label="Conversations" className="scroll-thin mt-2 flex-1 overflow-y-auto px-2 pb-2">
        {listStatus === "loading" && (
          <div className="grid place-items-center py-16 text-muted">
            <Spinner className="size-5" />
          </div>
        )}
        {listStatus === "error" && (
          <ListMessage title="Couldn't load your conversations">
            <Button variant="secondary" size="sm" onClick={() => useChat.getState().loadConversations()}>
              Try again
            </Button>
          </ListMessage>
        )}
        {listStatus === "ready" && visible.length === 0 && (
          <ListMessage
            title={query || filter !== "all" ? "Nothing matches" : "No conversations yet"}
            text={query || filter !== "all" ? "Try another name or filter." : "Find someone to talk to and say hi."}
          >
            {!query && filter === "all" && (
              <Button size="sm" onClick={onNewChat}>
                <SquarePen className="size-4" /> New message
              </Button>
            )}
          </ListMessage>
        )}
        <ul className="space-y-0.5">
          {visible.map((c) => (
            <li key={c._id}>
              <ConversationItem
                conversation={c}
                active={c._id === conversationId}
                online={Boolean(online[c.participant._id])}
                typing={Boolean(typing[c._id])}
              />
            </li>
          ))}
        </ul>
      </nav>

      <CurrentUser />
    </aside>
  );
}

function ListMessage({ title, text, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

function ThemeToggle() {
  const mode = usePreferences((s) => s.mode);
  const setMode = usePreferences((s) => s.setMode);
  const dark = resolveTheme(mode) === "dark";
  return (
    <IconButton label={dark ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setMode(dark ? "light" : "dark")}>
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </IconButton>
  );
}

function CurrentUser() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const connected = useChat((s) => s.socketStatus === "connected");

  return (
    <footer className="safe-bottom flex items-center gap-3 border-t border-line px-4 pt-3">
      <Link
        to="/settings"
        title="Your profile"
        className="-m-1 flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 hover:bg-surface-2"
      >
        <Avatar name={user.fullName} src={user.profilePic} size="sm" online={connected} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{user.fullName}</span>
          <span className="block truncate text-xs text-muted">{connected ? user.status || "Online" : "Connecting…"}</span>
        </span>
      </Link>
      <Link
        to="/settings"
        aria-label="Settings"
        title="Settings"
        className="grid size-10 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg"
      >
        <Settings className="size-5" />
      </Link>
      <IconButton label="Sign out" onClick={logout}>
        <LogOut className="size-5" />
      </IconButton>
    </footer>
  );
}
