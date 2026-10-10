import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, X } from "lucide-react";
import { mediaUrl } from "../../lib/api.js";
import { useLightbox } from "../../stores/lightbox.js";

async function download(src) {
  try {
    const response = await fetch(src);
    const url = URL.createObjectURL(await response.blob());
    const link = Object.assign(document.createElement("a"), { href: url, download: src.split("/").pop() || "photo" });
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(src, "_blank", "noopener");
  }
}

export function Lightbox() {
  const src = useLightbox((s) => s.src);
  const hide = useLightbox((s) => s.hide);

  useEffect(() => {
    if (!src) return;
    const onKey = (e) => e.key === "Escape" && hide();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [src, hide]);

  if (!src) return null;
  const url = mediaUrl(src);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Photo" className="fixed inset-0 z-[60] flex animate-fade-in flex-col bg-black/90">
      <div className="flex justify-end gap-1 p-3 text-white">
        <button type="button" onClick={() => download(url)} aria-label="Download" className="grid size-10 place-items-center rounded-xl hover:bg-white/10">
          <Download className="size-5" />
        </button>
        <button type="button" onClick={hide} aria-label="Close" className="grid size-10 place-items-center rounded-xl hover:bg-white/10">
          <X className="size-6" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 pt-0" onClick={hide}>
        <img src={url} alt="" className="max-h-full max-w-full animate-pop-in rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
      </div>
    </div>,
    document.body,
  );
}
