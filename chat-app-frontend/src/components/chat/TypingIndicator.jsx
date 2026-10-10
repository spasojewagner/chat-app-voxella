import { Avatar } from "../ui/Avatar.jsx";

export function TypingIndicator({ participant }) {
  return (
    <div className="mt-3 flex animate-slide-up items-end gap-2" aria-live="polite">
      <Avatar name={participant.fullName} src={participant.profilePic} size="xs" />
      <div className="flex h-9 items-center gap-1 rounded-2xl rounded-bl-md bg-bubble-in px-3.5" aria-label={`${participant.fullName} is typing`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-1.5 animate-typing rounded-full bg-muted" style={{ animationDelay: `${i * 160}ms` }} />
        ))}
      </div>
    </div>
  );
}
