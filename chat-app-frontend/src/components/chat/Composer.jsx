import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ImagePlus, SendHorizontal, Smile, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/cn.js";
import { IMAGE_TYPES, validateImage } from "../../lib/images.js";
import { emitTyping } from "../../lib/socket.js";
import { useChat } from "../../stores/chat.js";
import { resolveTheme, usePreferences } from "../../stores/preferences.js";
import { Button, IconButton } from "../ui/Button.jsx";
import { Spinner } from "../ui/Spinner.jsx";

// The picker is large; load it the first time someone opens it.
const EmojiPicker = lazy(() => import("emoji-picker-react"));

const TYPING_REFRESH = 2_500;
const TYPING_IDLE = 3_000;

/** Unsent text per conversation, kept while switching between chats. */
const drafts = new Map();

export function Composer({ conversation, attachment, onAttachment }) {
  const id = conversation._id;
  const send = useChat((s) => s.send);
  const theme = resolveTheme(usePreferences((s) => s.mode));
  const [text, setText] = useState(() => drafts.get(id) ?? "");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textarea = useRef(null);
  const fileInput = useRef(null);
  const emojiArea = useRef(null);
  const typingSentAt = useRef(0);
  const idleTimer = useRef(null);

  const preview = useObjectUrl(attachment);
  const canSend = text.trim().length > 0 || Boolean(attachment);

  useEffect(() => {
    drafts.set(id, text);
  }, [id, text]);

  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) textarea.current?.focus();
    return () => {
      clearTimeout(idleTimer.current);
      if (typingSentAt.current) emitTyping(id, false);
    };
  }, [id]);

  useEffect(() => {
    if (!emojiOpen) return;
    const onPointer = (e) => !emojiArea.current?.contains(e.target) && setEmojiOpen(false);
    const onKey = (e) => e.key === "Escape" && setEmojiOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [emojiOpen]);

  function stopTyping() {
    clearTimeout(idleTimer.current);
    if (typingSentAt.current) emitTyping(id, false);
    typingSentAt.current = 0;
  }

  function signalTyping() {
    const now = Date.now();
    if (now - typingSentAt.current > TYPING_REFRESH) {
      emitTyping(id, true);
      typingSentAt.current = now;
    }
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(stopTyping, TYPING_IDLE);
  }

  function attach(file) {
    if (!file) return;
    const problem = validateImage(file);
    if (problem) toast.error(problem);
    else onAttachment(file);
  }

  function submit(event) {
    event?.preventDefault();
    if (!canSend) return;
    send(id, { text, file: attachment });
    setText("");
    onAttachment(null);
    setEmojiOpen(false);
    stopTyping();
    textarea.current?.focus();
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  function onPaste(event) {
    const file = [...event.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (file) {
      event.preventDefault();
      attach(file);
    }
  }

  function insertEmoji(emoji) {
    const el = textarea.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  if (conversation.blockedByMe || conversation.blockedMe) {
    return <BlockedNotice conversation={conversation} />;
  }

  return (
    <form onSubmit={submit} className="safe-bottom border-t border-line bg-surface px-3 pt-3 md:px-4">
      {attachment && (
        <div className="mb-2 flex animate-slide-up items-center gap-3 rounded-2xl bg-surface-2 p-2 pr-3">
          <img src={preview} alt="" className="size-14 rounded-xl object-cover" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium">{attachment.name || "Pasted image"}</p>
            <p className="text-muted">{(attachment.size / 1024).toFixed(0)} KB · add a caption or send</p>
          </div>
          <IconButton label="Remove photo" onClick={() => onAttachment(null)} className="size-8">
            <X className="size-4" />
          </IconButton>
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            attach(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <IconButton label="Attach a photo" onClick={() => fileInput.current?.click()}>
          <ImagePlus className="size-5" />
        </IconButton>

        <div className="relative flex min-h-10 flex-1 items-end rounded-[20px] bg-surface-2 focus-within:ring-2 focus-within:ring-accent-soft">
          <textarea
            ref={textarea}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value) signalTyping();
              else stopTyping();
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder="Message"
            aria-label={`Message ${conversation.participant.fullName}`}
            maxLength={4000}
            className="scroll-thin max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2.5 pl-4 text-[15px] leading-5 outline-none placeholder:text-faint"
          />
          <div ref={emojiArea} className="relative">
            <IconButton label="Emoji" active={emojiOpen} onClick={() => setEmojiOpen((v) => !v)} className="rounded-full">
              <Smile className="size-5" />
            </IconButton>
            {emojiOpen && (
              <div className="absolute right-0 bottom-12 z-30 animate-pop-in">
                <Suspense
                  fallback={
                    <div className="grid h-[400px] w-[330px] place-items-center rounded-2xl border border-line bg-surface shadow-card">
                      <Spinner />
                    </div>
                  }
                >
                  <EmojiPicker
                    onEmojiClick={(data) => insertEmoji(data.emoji)}
                    theme={theme}
                    emojiStyle="native"
                    lazyLoadEmojis
                    previewConfig={{ showPreview: false }}
                    width={330}
                    height={400}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full transition-all",
            canSend ? "bg-accent text-accent-fg shadow-sm hover:bg-accent-strong" : "bg-surface-2 text-faint",
          )}
        >
          <SendHorizontal className="size-5" />
        </button>
      </div>
    </form>
  );
}

function BlockedNotice({ conversation }) {
  const [busy, setBusy] = useState(false);
  const name = conversation.participant.fullName.split(" ")[0];

  async function unblock() {
    setBusy(true);
    try {
      await useChat.getState().setBlocked(conversation.participant._id, false);
      toast.success(`${name} is unblocked.`);
    } catch {
      toast.error("Couldn't unblock. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="safe-bottom flex items-center justify-center gap-3 border-t border-line bg-surface px-4 pt-3 text-center text-sm text-muted">
      {conversation.blockedByMe ? (
        <>
          <span>You blocked {name}. They can&apos;t message you.</span>
          <Button size="sm" variant="secondary" loading={busy} onClick={unblock}>
            Unblock
          </Button>
        </>
      ) : (
        <span className="py-1.5">You can&apos;t reply to this conversation.</span>
      )}
    </div>
  );
}

function useObjectUrl(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) return setUrl(null);
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}
