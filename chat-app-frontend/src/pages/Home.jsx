// Home.jsx
import React from 'react';
import Chat from '../components/chat/Chat';
import { UserInfo } from '../components/user/UserInfo';
import Details from '../components/details/Details';
import ChatList from '../components/chat/chatList';
import TopHeader from '../components/TopHeader';
import NoChatOpen from '../components/chat/NoChatOpen';
import { useChatStore } from '../store/useChatStore';
import { IoMdArrowBack } from 'react-icons/io';

const Home = () => {
  const { selectedUser, showDetails, setShowDetails } = useChatStore();

  return (
    <>
      {/* Mobilni prikaz: visible ispod md */}
      <div className="md:hidden flex flex-col h-screen bg-base-100">
        {/* TopHeader uvek vidljiv */}
        <div className="flex-shrink-0">
          <TopHeader />
        </div>
        {/* Glavni sadržaj */}
        <div className="flex flex-1 overflow-hidden relative">
          {!selectedUser ? (
            <div className="w-full flex flex-col">
              <div className="px-2 py-2 border-b border-base-300">
                <UserInfo />
              </div>
              <div className="flex-1 px-2 overflow-y-auto">
                <ChatList />
              </div>
            </div>
          ) : showDetails ? (
            <div className="w-full p-4 overflow-y-auto">
              {/* Dugme za nazad u prikazu detalja */}
              <button
                onClick={() => setShowDetails(false)}
                className="absolute top-4 left-4 z-10"
              >
                <IoMdArrowBack size={25} />
              </button>
              <Details />
            </div>
          ) : (
            <div className="w-full p-4 overflow-y-auto">
              <Chat />
            </div>
          )}
        </div>
      </div>

      {/* Desktop prikaz: visible na md i većim */}
      <div className="hidden md:flex flex-col h-screen bg-base-100">
        {/* TopHeader uvek vidljiv */}
        <div className="flex-shrink-0">
          <TopHeader />
        </div>
        {/* Glavni sadržaj */}
        <div className="flex flex-1 overflow-hidden">
          {/* Leva kolona: ChatList + UserInfo */}
          <div className="flex flex-col border-r border-base-300">
            <div className="px-2 border-base-300">
              <UserInfo />
            </div>
            <div className="flex-1 px-2 overflow-y-auto">
              <ChatList />
            </div>
          </div>

          {/* Centralna kolona: Chat ili NoChatOpen */}
          <div className="flex-1 p-4 overflow-y-auto">
            {!selectedUser ? <NoChatOpen /> : <Chat />}
          </div>

          {/* Desna kolona: Details, prikazuje se samo ako je chat izabran */}
          <div className="w-75 flex-shrink-0 border-l bg-base-200 rounded-2xl border-base-300 p-4 overflow-y-auto mr-2">
            {selectedUser && <Details />}
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
