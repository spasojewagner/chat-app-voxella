import { useEffect } from "react";
import { Outlet } from "react-router";
import { toast } from "sonner";
import { connectSocket, disconnectSocket } from "../lib/socket.js";
import { useAuth } from "../stores/auth.js";
import { totalUnread, useChat } from "../stores/chat.js";

/** Everything that lives as long as the user is signed in: the socket, the chat list, the tab title. */
export function SessionLayout() {
  const userId = useAuth((s) => s.user?._id);
  const unread = useChat((s) => totalUnread(s.conversations));

  useEffect(() => {
    if (!userId) return;
    const chat = useChat.getState();
    chat.setMe(userId);
    chat.loadConversations();
    connectSocket({
      onUnauthorized: () => {
        toast.error("Your session has ended. Please sign in again.");
        useAuth.getState().signedOut();
      },
      onBlockUpdated: ({ userId: other, blockedByMe }) => {
        if (blockedByMe !== undefined) useAuth.getState().setBlocked(other, blockedByMe);
      },
    });
    return () => {
      disconnectSocket();
      useChat.getState().reset();
    };
  }, [userId]);

  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) VoxElla` : "VoxElla";
  }, [unread]);

  return <Outlet />;
}
