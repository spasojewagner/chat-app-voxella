import { create } from "zustand";
import { api, setUnauthorizedHandler } from "../lib/api.js";

/**
 * status: "checking" while the session cookie is verified on load,
 * then "authenticated" or "guest".
 */
export const useAuth = create((set, get) => ({
  user: null,
  status: "checking",

  async restore() {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data, status: "authenticated" });
    } catch {
      set({ user: null, status: "guest" });
    }
  },

  async login(credentials) {
    const { data } = await api.post("/auth/login", credentials);
    set({ user: data, status: "authenticated" });
    return data;
  },

  async register(details) {
    const { data } = await api.post("/auth/register", details);
    set({ user: data, status: "authenticated" });
    return data;
  },

  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      get().signedOut();
    }
  },

  /** The session is gone (logout, expiry or a 401 anywhere). */
  signedOut() {
    set({ user: null, status: "guest" });
  },

  async updateProfile(changes) {
    const { data } = await api.patch("/users/me", changes);
    set({ user: data });
    return data;
  },

  async uploadAvatar(file) {
    const form = new FormData();
    form.append("avatar", file);
    const { data } = await api.put("/users/me/avatar", form);
    set({ user: data });
    return data;
  },

  async changePassword(passwords) {
    await api.put("/users/me/password", passwords);
  },

  setBlocked(userId, blocked) {
    const user = get().user;
    if (!user) return;
    const others = (user.blockedUsers ?? []).filter((id) => id !== userId);
    set({ user: { ...user, blockedUsers: blocked ? [...others, userId] : others } });
  },
}));

setUnauthorizedHandler(() => {
  if (useAuth.getState().status === "authenticated") useAuth.getState().signedOut();
});
