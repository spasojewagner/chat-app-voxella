import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ImagePlus, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/cn.js";
import { validateImage } from "../../lib/images.js";
import { useChat } from "../../stores/chat.js";
import { Spinner } from "../ui/Spinner.jsx";
import { ChatHeader } from "./ChatHeader.jsx";
import { Composer } from "./Composer.jsx";
import { MessageList } from "./MessageList.jsx";

const paneClass =
  "relative flex min-w-0 flex-1 flex-col overflow-hidden bg-surface md:rounded-2xl md:border md:border-line md:shadow-card";

export function ChatPane({ conversationId, detailsOpen, onToggleDetails }) {
  const conversation = useChat((s) => s.conversations[conversationId]);
  const loaded = useChat((s) => Boolean(s.threads[conversationId]?.loaded));
  const unread = conversation?.unreadCount ?? 0;
  const [missing, setMissing] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [dragging, setDragging] = useState(false);
  const exists = Boolean(conversation);

  useEffect(() => {
    if (!exists) useChat.getState().fetchConversation(conversationId).catch(() => setMissing(true));
  }, [conversationId, exists]);

  useEffect(() => {
    const chat = useChat.getState();
    if (exists && !chat.threads[conversationId]?.loaded) chat.loadMessages(conversationId);
  }, [conversationId, exists]);

  // Read receipts go out only while the conversation is actually on screen.
  useEffect(() => {
    if (!loaded || unread === 0) return;
    const markIfVisible = () => {
      if (document.visibilityState === "visible") useChat.getState().markRead(conversationId);
    };
    markIfVisible();
    document.addEventListener("visibilitychange", markIfVisible);
    return () => document.removeEventListener("visibilitychange", markIfVisible);
  }, [conversationId, loaded, unread]);

  if (missing) {
    return (
      <section className={cn(paneClass, "items-center justify-center p-8 text-center")}>
        <p className="text-lg font-semibold">Conversation not found</p>
        <p className="mt-1 text-muted">It may have been removed, or the link is wrong.</p>
        <Link to="/" className="mt-5 font-medium text-accent hover:underline">
          Back to your conversations
        </Link>
      </section>
    );
  }

  if (!conversation) {
    return (
      <section className={cn(paneClass, "items-center justify-center text-muted")}>
        <Spinner className="size-6" />
      </section>
    );
  }

  const canAttach = !conversation.blockedByMe && !conversation.blockedMe;

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    const file = [...event.dataTransfer.files].find((f) => f.type.startsWith("image/"));
    if (!file || !canAttach) return;
    const problem = validateImage(file);
    if (problem) toast.error(problem);
    else setAttachment(file);
  }

  return (
    <section
      className={paneClass}
      onDragOver={(e) => {
        if (canAttach && [...e.dataTransfer.types].includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDragging(false)}
      onDrop={onDrop}
    >
      <ChatHeader conversation={conversation} detailsOpen={detailsOpen} onToggleDetails={onToggleDetails} />
      <ConnectionBanner />
      <MessageList conversation={conversation} />
      <Composer conversation={conversation} attachment={attachment} onAttachment={setAttachment} />

      {dragging && (
        <div className="pointer-events-none absolute inset-2 z-20 grid animate-fade-in place-items-center rounded-2xl border-2 border-dashed border-accent bg-surface/85 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-accent">
            <ImagePlus className="size-8" />
            <p className="font-medium">Drop the photo to send it</p>
          </div>
        </div>
      )}
    </section>
  );
}

function ConnectionBanner() {
  const offline = useChat((s) => s.socketStatus === "disconnected");
  if (!offline) return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-amber-500/12 px-3 py-1.5 text-[13px] font-medium text-amber-700 dark:text-amber-300">
      <WifiOff className="size-3.5" /> Reconnecting… messages will sync when you&apos;re back online.
    </div>
  );
}
