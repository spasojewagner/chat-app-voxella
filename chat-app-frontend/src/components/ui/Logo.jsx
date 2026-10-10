import { cn } from "../../lib/cn.js";

export function LogoMark({ className }) {
  return (
    <span className={cn("brand-gradient grid size-9 place-items-center rounded-xl shadow-sm", className)}>
      <svg viewBox="0 0 40 40" className="size-[62%]" aria-hidden="true">
        <path
          d="M6 9.5A3.5 3.5 0 0 1 9.5 6h21A3.5 3.5 0 0 1 34 9.5v15a3.5 3.5 0 0 1-3.5 3.5H19l-7 6v-6H9.5A3.5 3.5 0 0 1 6 24.5z"
          fill="white"
        />
        <path
          d="M13.5 11.5 20 22l6.5-10.5"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({ className }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[19px] font-semibold tracking-tight">
        Vox<span className="text-accent">Ella</span>
      </span>
    </span>
  );
}
