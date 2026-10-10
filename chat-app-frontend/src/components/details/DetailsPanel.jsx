import { useEffect, useMemo, useState } from "react";
import { Ban, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { useNow } from "../../hooks/useNow.js";
import { api, errorMessage, mediaUrl } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { formatLastSeen } from "../../lib/format.js";
import { useChat } from "../../stores/chat.js";
import { useLightbox } from "../../stores/lightbox.js";
import { Avatar } from "../ui/Avatar.jsx";
import { Button, IconButton } from "../ui/Button.jsx";
import { Dialog } from "../ui/Dialog.jsx";

export function DetailsPanel({ conversationId, overlay, onClose }) {
  const conversation = useChat((s) => s.conversations[conversationId]);
  const online = useChat((s) => Boolean(conversation && s.online[conversation.participant._id]));
  const imageCount = useChat((s) => s.threads[conversationId]?.messages.filter((m) => m.image && !m.pending).length ?? 0);
  const showImage = useLightbox((s) => s.show);
  const now = useNow();
  const [media, setMedia] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/conversations/${conversationId}/media`)
      .then(({ data }) => !cancelled && setMedia(data))
      .catch(() => !cancelled && setMedia([]));
    return () => {
      cancelled = true;
    };
  }, [conversationId, imageCount]);

  useEffect(() => {
    if (!overlay) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [overlay, onClose]);

  if (!conversation) return null;
  const { participant } = conversation;
  const blocked = conversation.blockedByMe || conversation.blockedMe;

  const panel = (
    <aside
      aria-label="Conversation details"
      className={cn(
        "scroll-thin flex flex-col overflow-y-auto bg-surface",
        overlay
          ? "fixed inset-y-0 right-0 z-40 w-full max-w-sm animate-slide-up border-l border-line shadow-card"
          : "w-[320px] shrink-0 rounded-2xl border border-line shadow-card",
      )}
    >
      <div className="flex justify-end p-2">
        <IconButton label="Close details" onClick={onClose}>
          <X className="size-5" />
        </IconButton>
      </div>

      <div className="flex flex-col items-center px-6 pb-6 text-center">
        <Avatar name={participant.fullName} src={participant.profilePic} size="xl" online={online && !blocked} />
        <h2 className="mt-4 text-xl font-semibold tracking-tight">{participant.fullName}</h2>
        <p className={cn("mt-0.5 text-sm", online && !blocked ? "text-success" : "text-muted")}>
          {blocked ? " " : online ? "Online" : formatLastSeen(participant.lastSeenAt, now)}
        </p>
        {participant.status && !conversation.blockedMe && (
          <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-sm text-fg">{participant.status}</p>
        )}
      </div>

      <section className="border-t border-line px-5 py-5">
        <h3 className="flex items-center justify-between text-sm font-semibold">
          Shared photos
          {media?.length > 0 && <span className="text-xs font-medium text-muted">{media.length}</span>}
        </h3>
        {media === null ? (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="aspect-square animate-pulse rounded-lg bg-surface-2" />
            ))}
          </div>
        ) : media.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <ImageIcon className="size-4" /> Photos you share will show up here.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {media.map((m) => (
              <button
                key={m._id}
                type="button"
                onClick={() => showImage(m.image)}
                className="aspect-square overflow-hidden rounded-lg bg-surface-2"
                aria-label="Open photo"
              >
                <img src={mediaUrl(m.image)} alt="" loading="lazy" className="size-full object-cover transition-transform hover:scale-105" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-auto border-t border-line px-5 py-5">
        <h3 className="text-sm font-semibold">Privacy</h3>
        {conversation.blockedMe && !conversation.blockedByMe && (
          <p className="mt-2 text-sm text-muted">{participant.fullName} isn&apos;t accepting messages from you.</p>
        )}
        <BlockControl conversation={conversation} />
      </section>
    </aside>
  );

  if (!overlay) return panel;
  return (
    <>
      <div className="fixed inset-0 z-30 animate-fade-in bg-black/30" onClick={onClose} />
      {panel}
    </>
  );
}

function BlockControl({ conversation }) {
  const { participant } = conversation;
  const firstName = useMemo(() => participant.fullName.split(" ")[0], [participant.fullName]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function setBlocked(blocked) {
    setBusy(true);
    try {
      await useChat.getState().setBlocked(participant._id, blocked);
      toast.success(blocked ? `${firstName} is blocked.` : `${firstName} is unblocked.`);
      setConfirming(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (conversation.blockedByMe) {
    return (
      <Button variant="secondary" className="mt-3 w-full" loading={busy} onClick={() => setBlocked(false)}>
        Unblock {firstName}
      </Button>
    );
  }

  return (
    <>
      <Button variant="danger" className="mt-3 w-full" onClick={() => setConfirming(true)}>
        <Ban className="size-4" /> Block {firstName}
      </Button>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Block ${firstName}?`}
        description={`${firstName} won't be able to message you, find you in search or see when you're typing. You can unblock them any time.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button className="bg-danger text-white hover:bg-danger/90" loading={busy} onClick={() => setBlocked(true)}>
            Block
          </Button>
        </div>
      </Dialog>
    </>
  );
}
