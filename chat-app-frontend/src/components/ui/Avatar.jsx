import { useState } from "react";
import { mediaUrl } from "../../lib/api.js";
import { cn } from "../../lib/cn.js";
import { initials } from "../../lib/format.js";

const SIZES = {
  xs: "size-7 text-[11px]",
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
  xl: "size-24 text-2xl",
};
const DOT = { xs: "size-2.5", sm: "size-3", md: "size-3.5", lg: "size-4", xl: "size-5" };

function hue(name = "") {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)) % 360;
  return hash;
}

export function Avatar({ name, src, size = "md", online = false, className }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {showImage ? (
        <img
          src={mediaUrl(src)}
          alt=""
          onError={() => setFailed(true)}
          className={cn(SIZES[size], "rounded-full object-cover bg-surface-3")}
        />
      ) : (
        <span
          aria-hidden="true"
          style={{ "--h": hue(name) }}
          className={cn(
            SIZES[size],
            "grid place-items-center rounded-full font-semibold tracking-tight select-none",
            "bg-[hsl(var(--h)_75%_92%)] text-[hsl(var(--h)_45%_32%)]",
            "dark:bg-[hsl(var(--h)_32%_22%)] dark:text-[hsl(var(--h)_75%_80%)]",
          )}
        >
          {initials(name)}
        </span>
      )}
      {online && (
        <span
          className={cn(DOT[size], "absolute right-0 bottom-0 rounded-full bg-success ring-2 ring-surface")}
          aria-label="Online"
        />
      )}
    </span>
  );
}
