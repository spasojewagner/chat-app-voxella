import { create } from "zustand";

/** The photo open in the full-screen viewer, if any. */
export const useLightbox = create((set) => ({
  src: null,
  show: (src) => set({ src }),
  hide: () => set({ src: null }),
}));
