import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { ChatPane } from "../components/chat/ChatPane.jsx";
import { EmptyChat } from "../components/chat/EmptyChat.jsx";
import { Lightbox } from "../components/chat/Lightbox.jsx";
import { DetailsPanel } from "../components/details/DetailsPanel.jsx";
import { NewChatDialog } from "../components/sidebar/NewChatDialog.jsx";
import { Sidebar } from "../components/sidebar/Sidebar.jsx";
import { useMediaQuery } from "../hooks/useMediaQuery.js";
import { useChat } from "../stores/chat.js";

const DETAILS_KEY = "voxella.details-open";

function readDetailsPreference() {
  try {
    return localStorage.getItem(DETAILS_KEY) !== "false";
  } catch {
    return true;
  }
}

/**
 * Three panes on wide screens (list, chat, details), two on tablets (details slides over),
 * and one at a time on phones, driven by the URL so the back button works as expected.
 */
export default function ChatPage() {
  const { conversationId } = useParams();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isWide = useMediaQuery("(min-width: 1280px)");
  const [detailsOpen, setDetailsOpen] = useState(() => isWide && readDetailsPreference());
  const [newChatOpen, setNewChatOpen] = useState(false);

  useEffect(() => {
    useChat.getState().setActive(conversationId ?? null);
    return () => useChat.getState().setActive(null);
  }, [conversationId]);

  const toggleDetails = useCallback(() => {
    setDetailsOpen((open) => {
      try {
        if (isWide) localStorage.setItem(DETAILS_KEY, String(!open));
      } catch {
        // preference only
      }
      return !open;
    });
  }, [isWide]);

  const openNewChat = useCallback(() => setNewChatOpen(true), []);
  const showList = isDesktop || !conversationId;
  const showChat = isDesktop || Boolean(conversationId);

  return (
    <div className="flex h-full overflow-hidden bg-bg md:gap-3 md:p-3">
      {showList && <Sidebar onNewChat={openNewChat} className="w-full md:w-[340px] lg:w-[360px]" />}

      {showChat &&
        (conversationId ? (
          <ChatPane
            key={conversationId}
            conversationId={conversationId}
            detailsOpen={detailsOpen}
            onToggleDetails={toggleDetails}
          />
        ) : (
          <EmptyChat onNewChat={openNewChat} />
        ))}

      {conversationId && detailsOpen && (
        <DetailsPanel conversationId={conversationId} overlay={!isWide} onClose={toggleDetails} />
      )}

      <NewChatDialog open={newChatOpen} onClose={() => setNewChatOpen(false)} />
      <Lightbox />
    </div>
  );
}
