// store/useAuthStore.js
import { create } from "zustand";
import { axiosInstance } from "../https";
import { io } from "socket.io-client";

const BASE_URL = "http://localhost:8000/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  blockedBy: null,

  notifications: [],
  addNotification: (notification) =>
    set({ notifications: [...get().notifications, notification] }),
  removeNotification: (id) =>
    set({ notifications: get().notifications.filter((n) => n.id !== id) }),
  clearNotifications: () => set({ notifications: [] }),

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("api/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  register: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/api/auth/register", data);
      set({ authUser: res.data });
      get().connectSocket();
      return { success: true, message: "Registration successful" };
    } catch (error) {
      console.log("Error in register:", error);
      return { success: false, message: "Registration failed" };
    } finally {
      set({ isSigningUp: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/api/auth/logout");
      set({ authUser: null, blockedBy: null });
      get().disconnectSocket();
    } catch (error) {
      console.log("Error in logout:", error);
    }
  },

  login: async (credentials) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/api/auth/login", credentials);
      set({ authUser: res.data });
      get().connectSocket();
      return { success: true, message: "Login successful" };
    } catch (error) {
      console.log("Error in login:", error);
      return {
        success: false,
        message: error.response?.data?.error || "Login failed. Try again.",
      };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/api/auth/update-profile", data);
      set({ authUser: res.data });
      return { success: true, message: "Profile Updated" };
    } catch (error) {
      console.log("Error in updateProfile:", error);
      return { success: false, message: "Profile update failed" };
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  blockUser: async (targetUserId) => {
    try {
      const res = await axiosInstance.put("/api/auth/block", { userIdToBlock: targetUserId });
      set({ authUser: res.data.user });
      return { success: true, message: res.data.message };
    } catch (error) {
      console.log("Error in blockUser:", error);
      return { success: false, message: error.response?.data?.message || "Block failed" };
    }
  },

  unblockUser: async (targetUserId) => {
    try {
      const res = await axiosInstance.put("/api/auth/unblock", { userIdToUnblock: targetUserId });
      set({ authUser: res.data.user });
      return { success: true, message: res.data.message };
    } catch (error) {
      console.log("Error in unblockUser:", error);
      return { success: false, message: error.response?.data?.message || "Unblock failed" };
    }
  },

  // Nova funkcija koja proverava da li je trenutni korisnik blokiran od strane target korisnika
  checkBlockStatus: async (targetUserId) => {
    try {
      const res = await axiosInstance.get(`/api/auth/${targetUserId}/block-status`);
      if (res.data.isBlocked) {
        set({ blockedBy: targetUserId });
      } else {
        set({ blockedBy: null });
      }
    } catch (error) {
      console.error("Error checking block status:", error);
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket: socket });

    socket.on("x", (userIds) => {
      set({ onlineUsers: userIds });
    });

    // Ako primimo događaj da je neko blokirao authUser, postavi blockedBy
    socket.on("userBlocked", ({ blocker, blocked }) => {
      if (blocked === get().authUser._id) {
        set({ blockedBy: blocker });
      }
    });
    
    socket.on("userUnblocked", ({ blocker, unblocked }) => {
      if (unblocked === get().authUser._id) {
        set({ blockedBy: null });
      }
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
