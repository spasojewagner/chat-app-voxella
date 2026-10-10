import { create } from "zustand";
import { api, errorMessage } from "../lib/api.js";

export const PAGE_SIZE = 30;
const TYPING_TTL = 6_000;

const typingTimers = new Map();
/** Files of failed messages, kept so "Retry" can resend them. */
const pendingFiles = new Map();

const emptyThread = { messages: [], hasMore: true, loading: false, loaded: false, error: null };

const initialState = {
  me: null,
  conversations: {},
  listStatus: "idle",
  threads: {},
  activeId: null,
  typing: {},
  online: {},
  socketStatus: "connecting",
};

const byCreatedAt = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);

/** Combines the newest page from the server with what is already on screen. */
function mergeMessages(current, incoming) {
  const byId = new Map(current.filter((m) => !m.pending && !m.failed).map((m) => [m._id, m]));
  for (const message of incoming) byId.set(message._id, message);
  const local = current.filter((m) => m.pending || m.failed);
  return [...[...byId.values()].sort(byCreatedAt), ...local];
}

/**
 * Conversations, message threads, presence and typing state. Socket events and REST
 * responses go through the same reducers (receiveMessage, receiveRead...), so an
 * optimistic message, its HTTP response and its socket echo always end up as one message.
 */
export const useChat = create((set, get) => {
  const patchThread = (id, patch) =>
    set((s) => ({ threads: { ...s.threads, [id]: { ...(s.threads[id] ?? emptyThread), ...patch(s.threads[id] ?? emptyThread) } } }));

  const patchConversation = (id, patch) =>
    set((s) => {
      const current = s.conversations[id];
      if (!current) return {};
      return { conversations: { ...s.conversations, [id]: { ...current, ...patch(current) } } };
    });

  const patchConversationsWith = (userId, patch) =>
    set((s) => {
      const conversations = { ...s.conversations };
      for (const [id, c] of Object.entries(conversations)) {
        if (c.participant?._id === userId) conversations[id] = { ...c, ...patch(c) };
      }
      return { conversations };
    });

  return {
    ...initialState,

    setMe: (me) => set({ me }),
    setActive: (activeId) => set({ activeId }),
    setSocketStatus: (socketStatus) => set({ socketStatus }),

    reset() {
      for (const timer of typingTimers.values()) clearTimeout(timer);
      typingTimers.clear();
      pendingFiles.clear();
      set(initialState);
    },

    upsertConversation(conversation) {
      set((s) => {
        const online = { ...s.online };
        if (conversation.participant?.isOnline) online[conversation.participant._id] = true;
        return { conversations: { ...s.conversations, [conversation._id]: conversation }, online };
      });
    },

    async loadConversations() {
      if (get().listStatus === "idle") set({ listStatus: "loading" });
      try {
        const { data } = await api.get("/conversations");
        set((s) => {
          // Keep conversations opened in this session that have no messages yet.
          const conversations = Object.fromEntries(
            Object.entries(s.conversations).filter(([, c]) => !c.lastMessage),
          );
          const online = { ...s.online };
          for (const c of data) {
            conversations[c._id] = c;
            if (c.participant?.isOnline) online[c.participant._id] = true;
          }
          return { conversations, online, listStatus: "ready" };
        });
      } catch {
        set({ listStatus: "error" });
      }
    },

    async fetchConversation(id) {
      const { data } = await api.get(`/conversations/${id}`);
      get().upsertConversation(data);
      return data;
    },

    async startConversation(userId) {
      const { data } = await api.post("/conversations", { userId });
      get().upsertConversation(data);
      return data._id;
    },

    async loadMessages(id, { older = false } = {}) {
      const thread = get().threads[id] ?? emptyThread;
      if (thread.loading || (older && !thread.hasMore)) return;

      const oldest = thread.messages.find((m) => !m.pending && !m.failed);
      const params = { limit: PAGE_SIZE, ...(older && oldest ? { before: oldest._id } : {}) };
      patchThread(id, () => ({ loading: true, error: null }));
      try {
        const { data } = await api.get(`/conversations/${id}/messages`, { params });
        patchThread(id, (t) => ({
          loading: false,
          loaded: true,
          error: null,
          messages: older ? [...data.messages, ...t.messages] : mergeMessages(t.messages, data.messages),
          // A refresh of the newest page must not forget that older pages exist.
          hasMore: older || !t.loaded ? data.hasMore : t.hasMore,
        }));
      } catch (error) {
        patchThread(id, () => ({ loading: false, error: errorMessage(error) }));
      }
    },

    async send(conversationId, { text = "", file = null }) {
      const { me, conversations } = get();
      const conversation = conversations[conversationId];
      if (!conversation || (!text.trim() && !file)) return;

      const clientId = `tmp-${crypto.randomUUID()}`;
      const createdAt = new Date().toISOString();
      const optimistic = {
        _id: clientId,
        clientId,
        conversationId,
        senderId: me,
        receiverId: conversation.participant?._id,
        text: text.trim(),
        image: file ? URL.createObjectURL(file) : undefined,
        createdAt,
        readAt: null,
        pending: true,
      };
      patchThread(conversationId, (t) => ({ messages: [...t.messages, optimistic] }));
      patchConversation(conversationId, () => ({
        lastMessage: { _id: clientId, senderId: me, text: optimistic.text, hasImage: Boolean(file), createdAt, seen: false },
        lastMessageAt: createdAt,
      }));

      try {
        let body = { text: optimistic.text, clientId };
        if (file) {
          body = new FormData();
          body.append("text", optimistic.text);
          body.append("clientId", clientId);
          body.append("image", file);
        }
        const { data } = await api.post(`/conversations/${conversationId}/messages`, body);
        get().receiveMessage(data);
      } catch (error) {
        if (file) pendingFiles.set(clientId, file);
        patchThread(conversationId, (t) => ({
          messages: t.messages.map((m) =>
            m.clientId === clientId ? { ...m, pending: false, failed: true, error: errorMessage(error) } : m,
          ),
        }));
        if (error?.response?.data?.code?.startsWith("BLOCKED")) {
          patchConversation(conversationId, () =>
            error.response.data.code === "BLOCKED_BY_YOU" ? { blockedByMe: true } : { blockedMe: true },
          );
        }
      }
    },

    retry(conversationId, clientId) {
      const failed = get().threads[conversationId]?.messages.find((m) => m.clientId === clientId);
      if (!failed) return;
      const file = pendingFiles.get(clientId) ?? null;
      get().discard(conversationId, clientId);
      return get().send(conversationId, { text: failed.text, file });
    },

    discard(conversationId, clientId) {
      pendingFiles.delete(clientId);
      patchThread(conversationId, (t) => ({
        messages: t.messages.filter((m) => {
          if (m.clientId !== clientId) return true;
          if (m.image?.startsWith("blob:")) URL.revokeObjectURL(m.image);
          return false;
        }),
      }));
    },

    async markRead(conversationId) {
      const conversation = get().conversations[conversationId];
      if (!conversation?.unreadCount) return;
      patchConversation(conversationId, () => ({ unreadCount: 0 }));
      try {
        await api.post(`/conversations/${conversationId}/read`);
      } catch {
        // The badge comes back with the next refresh; nothing else to undo.
      }
    },

    async setBlocked(userId, blocked) {
      await (blocked ? api.post(`/users/${userId}/block`) : api.delete(`/users/${userId}/block`));
      get().applyBlock({ userId, blockedByMe: blocked });
    },

    // ---- events (socket and HTTP responses) ----

    receiveMessage({ message, conversation }) {
      const { me } = get();
      if (conversation) get().upsertConversation(conversation);
      const id = String(message.conversationId);

      set((s) => {
        const thread = s.threads[id];
        if (!thread?.loaded) return {};
        const index = thread.messages.findIndex(
          (m) => (message.clientId && m.clientId === message.clientId) || m._id === message._id,
        );
        let messages;
        if (index === -1) {
          messages = [...thread.messages, message];
        } else {
          const previous = thread.messages[index];
          if (previous.image?.startsWith("blob:")) URL.revokeObjectURL(previous.image);
          messages = thread.messages.slice();
          messages[index] = { ...message, clientId: previous.clientId ?? message.clientId };
        }
        return { threads: { ...s.threads, [id]: { ...thread, messages } } };
      });

      if (String(message.senderId) !== me) get().receiveTyping({ conversationId: id, isTyping: false });
    },

    receiveRead({ conversationId, readerId, readAt }) {
      const { me } = get();
      const mine = readerId === me;

      if (mine) patchConversation(conversationId, () => ({ unreadCount: 0 }));
      else
        patchConversation(conversationId, (c) =>
          c.lastMessage && c.lastMessage.senderId === me ? { lastMessage: { ...c.lastMessage, seen: true } } : {},
        );

      set((s) => {
        const thread = s.threads[conversationId];
        if (!thread) return {};
        const cutoff = new Date(readAt);
        const messages = thread.messages.map((m) => {
          const shouldMark = mine ? m.receiverId === me : m.senderId === me && !m.pending;
          return shouldMark && !m.readAt && new Date(m.createdAt) <= cutoff ? { ...m, readAt } : m;
        });
        return { threads: { ...s.threads, [conversationId]: { ...thread, messages } } };
      });
    },

    receiveTyping({ conversationId, isTyping }) {
      clearTimeout(typingTimers.get(conversationId));
      typingTimers.delete(conversationId);
      if (isTyping) {
        // If the "stopped typing" event never arrives (closed tab), the indicator still goes away.
        typingTimers.set(
          conversationId,
          setTimeout(() => get().receiveTyping({ conversationId, isTyping: false }), TYPING_TTL),
        );
      }
      set((s) => {
        if (Boolean(s.typing[conversationId]) === isTyping) return {};
        const typing = { ...s.typing };
        if (isTyping) typing[conversationId] = true;
        else delete typing[conversationId];
        return { typing };
      });
    },

    setPresenceSnapshot(userIds) {
      set({ online: Object.fromEntries(userIds.map((id) => [id, true])) });
    },

    setPresence({ userId, online, lastSeenAt }) {
      set((s) => {
        const next = { ...s.online };
        if (online) next[userId] = true;
        else delete next[userId];
        return { online: next };
      });
      if (!online && lastSeenAt) {
        patchConversationsWith(userId, (c) => ({ participant: { ...c.participant, lastSeenAt } }));
      }
    },

    updateUser(user) {
      patchConversationsWith(user._id, (c) => ({ participant: { ...c.participant, ...user } }));
    },

    applyBlock({ userId, blockedByMe, blockedMe }) {
      patchConversationsWith(userId, () => ({
        ...(blockedByMe !== undefined ? { blockedByMe } : {}),
        ...(blockedMe !== undefined ? { blockedMe } : {}),
      }));
      if (blockedMe) {
        for (const c of Object.values(get().conversations)) {
          if (c.participant?._id === userId) get().receiveTyping({ conversationId: c._id, isTyping: false });
        }
      }
    },

    /** After a reconnect: pick up whatever happened while the socket was down. */
    async resync() {
      await get().loadConversations();
      const { activeId } = get();
      if (activeId) await get().loadMessages(activeId);
    },
  };
});

export const totalUnread = (conversations) =>
  Object.values(conversations).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
