import { io } from "socket.io-client";
import { useChat } from "../stores/chat.js";
import { API_URL } from "./api.js";

let socket = null;

/**
 * Opens the realtime connection. The session cookie authenticates it on the server,
 * so nothing about the user is sent in the handshake.
 */
export function connectSocket({ onUnauthorized, onUserUpdated, onBlockUpdated } = {}) {
  if (socket) return socket;
  const chat = () => useChat.getState();
  let connectedBefore = false;

  socket = io(API_URL || undefined, { withCredentials: true });

  socket.on("connect", () => {
    chat().setSocketStatus("connected");
    if (connectedBefore) chat().resync();
    connectedBefore = true;
  });
  socket.on("disconnect", () => chat().setSocketStatus("disconnected"));
  socket.on("connect_error", (error) => {
    if (error.message === "UNAUTHENTICATED") onUnauthorized?.();
    else chat().setSocketStatus("disconnected");
  });

  socket.on("presence:snapshot", ({ online }) => chat().setPresenceSnapshot(online));
  socket.on("presence:update", (update) => chat().setPresence(update));
  socket.on("message:new", (payload) => chat().receiveMessage(payload));
  socket.on("conversation:read", (payload) => chat().receiveRead(payload));
  socket.on("typing", (payload) => chat().receiveTyping(payload));
  socket.on("user:updated", ({ user }) => {
    chat().updateUser(user);
    onUserUpdated?.(user);
  });
  socket.on("block:updated", (payload) => {
    chat().applyBlock(payload);
    onBlockUpdated?.(payload);
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function emitTyping(conversationId, isTyping) {
  if (socket?.connected) socket.emit("typing", { conversationId, isTyping });
}
