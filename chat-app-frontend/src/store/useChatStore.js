import { create } from "zustand";
import { axiosInstance } from "../https";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  showDetails: false, // novo stanje
  setShowDetails: (value) => set({ showDetails: value }),


  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/api/messages/users");
      set({ users: res.data });
    } catch (error) {
      console.log(error);
    } finally {
      set({ isUsersLoading: false });
    }
  },
  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`api/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      console.log(error);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(
        `api/messages/send/${selectedUser._id}`,
        messageData
      );
      set({ messages: [...messages, res.data] });
    } catch (error) {
      // Ako backend vrati grešku 403 (npr. "You are blocked by this user"), obradimo je
      if (error.response && error.response.status === 403) {
        // Možeš ovde da prikažeš notifikaciju korisniku, ili postaviš neki state
        console.error("Greška: " + error.response.data.error);
      } else {
        console.log(error);
      }
    }
  },
  realTimeMessages: () => {
  const { selectedUser } = get();
  if (!selectedUser) return;
  const socket = useAuthStore.getState().socket;
  socket.on("newMessage", (newMessage) => {
    // Proveravamo da li poruka sa istim _id već postoji
    const currentMessages = get().messages;
    if (currentMessages.some((msg) => msg._id === newMessage._id)) return;
    if (newMessage.senderId !== selectedUser._id) return;
    
    set({ messages: [...currentMessages, newMessage] });
  });
},

  unrealTimeMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },
  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
