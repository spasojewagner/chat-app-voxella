import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/cn.js";
import { IconButton } from "./Button.jsx";

/** Modal dialog: closes on Escape and on a click outside; focus moves inside and comes back on close. */
export function Dialog({ open, onClose, title, description, children, className }) {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const focusable = panel.current?.querySelector("[autofocus], input, button:not([aria-label='Close'])");
    (focusable ?? panel.current)?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative w-full animate-slide-up rounded-t-3xl border border-line bg-surface shadow-card outline-none",
          "sm:max-w-md sm:rounded-3xl",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mt-1 -mr-2">
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="safe-bottom px-5 pt-4 pb-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
