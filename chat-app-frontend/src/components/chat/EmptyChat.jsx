import { SquarePen } from "lucide-react";
import { Button } from "../ui/Button.jsx";

export function EmptyChat({ onNewChat }) {
  return (
    <section className="chat-backdrop hidden min-w-0 flex-1 flex-col items-center justify-center rounded-2xl border border-line p-8 text-center shadow-card md:flex">
      <div className="relative mb-8 h-28 w-52" aria-hidden="true">
        <span className="absolute top-0 left-0 h-11 w-36 animate-float rounded-2xl rounded-bl-md bg-surface shadow-card" />
        <span
          className="brand-gradient absolute top-12 right-0 h-11 w-32 animate-float rounded-2xl rounded-br-md shadow-card"
          style={{ animationDelay: "1.2s" }}
        />
        <span className="absolute bottom-0 left-6 flex h-8 w-16 items-center justify-center gap-1 rounded-2xl rounded-bl-md bg-surface shadow-card">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 animate-typing rounded-full bg-faint" style={{ animationDelay: `${i * 160}ms` }} />
          ))}
        </span>
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Your messages</h2>
      <p className="mt-1.5 max-w-xs text-muted">Pick a conversation on the left, or start a new one with anyone on VoxElla.</p>
      <Button className="mt-6" onClick={onNewChat}>
        <SquarePen className="size-4" /> New message
      </Button>
    </section>
  );
}
