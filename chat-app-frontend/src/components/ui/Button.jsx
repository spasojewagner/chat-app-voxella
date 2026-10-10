import { cn } from "../../lib/cn.js";
import { Spinner } from "./Spinner.jsx";

const VARIANTS = {
  primary: "bg-accent text-accent-fg hover:bg-accent-strong shadow-sm",
  secondary: "bg-surface-2 text-fg hover:bg-surface-3",
  ghost: "text-fg hover:bg-surface-2",
  outline: "border border-line text-fg hover:bg-surface-2",
  danger: "border border-danger/30 text-danger hover:bg-danger/10",
};
const SIZES = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
};

export function Button({ variant = "primary", size = "md", loading = false, className, children, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors select-none",
        "disabled:opacity-55 disabled:pointer-events-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, active = false, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid size-10 shrink-0 place-items-center rounded-xl text-muted transition-colors",
        "hover:bg-surface-2 hover:text-fg disabled:opacity-40 disabled:pointer-events-none",
        active && "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
