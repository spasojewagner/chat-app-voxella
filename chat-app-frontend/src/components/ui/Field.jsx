import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/cn.js";

export const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-fg placeholder:text-faint " +
  "transition-[border-color,box-shadow] outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft " +
  "disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15";

export function Field({ label, error, hint, type = "text", className, ...props }) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && reveal ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-note` : undefined}
          className={cn(inputClass, isPassword && "pr-11")}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-faint hover:text-fg"
          >
            {reveal ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
          </button>
        )}
      </div>
      {(error || hint) && (
        <p id={`${id}-note`} className={cn("text-[13px]", error ? "text-danger" : "text-muted")}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
