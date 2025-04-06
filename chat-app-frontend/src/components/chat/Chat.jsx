// Chat.jsx
import React, { useEffect, useRef, useState } from 'react';
import img1 from '../../assets/korisnik.png';
import { FaPhoneAlt, FaVideo } from "react-icons/fa";
import { FaCircleInfo } from "react-icons/fa6";
import { MdAddAPhoto, MdEmojiEmotions } from "react-icons/md";
import { IoMdCloseCircleOutline, IoMdArrowBack } from "react-icons/io";
import { IoSend } from "react-icons/io5";
import EmojiPicker from 'emoji-picker-react';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatMessageTime } from '../../constance';

const Chat = () => {
  const {
    messages,
    getMessages,
    isMessageLoading,
    selectedUser,
    sendMessage,
    realTimeMessages,
    unrealTimeMessages,
    setSelectedUser,
    setShowDetails, // dodajemo funkciju za promenu showDetails stanja
  } = useChatStore();
  const { authUser, blockedBy, checkBlockStatus } = useAuthStore();

  const isBlocked = blockedBy === selectedUser?._id;

  // Message input states
  const [showEmoji, setShowEmoji] = useState(false);
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleEmoji = (emojiData) => {
    setText((prevText) => prevText + emojiData.emoji);
  };

  useEffect(() => {
    getMessages(selectedUser._id);
    realTimeMessages();
    return () => unrealTimeMessages();
  }, [selectedUser._id, getMessages, realTimeMessages, unrealTimeMessages]);

  useEffect(() => {
    if (selectedUser?._id) {
      checkBlockStatus(selectedUser._id);
    }
  }, [selectedUser._id, checkBlockStatus]);

  if (isMessageLoading)
    return (
      <div className="flex items-center justify-center h-[calc(100vh-5.5rem)] gap-2">
        <span className="loading loading-ring loading-xs"></span>
        <span className="loading loading-ring loading-sm"></span>
        <span className="loading loading-ring loading-md"></span>
        <span className="loading loading-ring loading-lg"></span>
        <span className="loading loading-ring loading-xl"></span>
      </div>
    );

  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image")) {
      console.log(file);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !image) || isBlocked) return;
    try {
      await sendMessage({
        text: text.trim(),
        image: image,
      });
      setText("");
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="relative h-[calc(100vh-5.5rem)] flex flex-col">
      {/* Gornji deo sa info o korisniku i dugmetom za nazad (samo na mobilu) */}
      <div className="flex items-center gap-3 justify-between p-3 border-b border-base-300">
        <button 
          className="block md:hidden"
          onClick={() => setSelectedUser(null)}
        >
          <IoMdArrowBack size={25} />
        </button>
        <div className="flex items-center gap-3">
          <img
            src={selectedUser?.profilePic || "avatar.png"}
            alt=""
            className="w-10 h-10 md:w-14 md:h-14 rounded-full"
          />
          <div className="flex flex-col">
            <h1 className="text-primary font-semibold text-lg md:text-xl">
              {selectedUser?.fullName}
            </h1>
            <p className="font-light text-xs md:text-sm">{selectedUser?.status}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <FaPhoneAlt size={20} className="cursor-pointer" />
          <FaVideo size={20} className="cursor-pointer" />
          {/* Klikom na ovu ikonicu otvara se prikaz detalja */}
          <FaCircleInfo
            size={20}
            className="cursor-pointer"
            onClick={() => setShowDetails(true)}
          />
        </div>
      </div>

      {/* Chat poruke */}
      <div className="overflow-y-auto h-[calc(100vh-14rem)] scrollbar-hide px-1 py-3 mb-3">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image size-10 rounded-full gap-1">
              <img
                src={
                  message.senderId === authUser._id
                    ? authUser?.profilePic || "/avatar.png"
                    : selectedUser?.profilePic || "/avatar.png"
                }
                className="rounded-full"
                alt=""
              />
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="max-w-[120px] sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
            <div className="chat-footer mb-1 mt-0.5">
              <time className="text-base-content text-xs ml-2">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
          </div>
        ))}
        <div ref={endRef}></div>
      </div>

      {/* Unos poruke */}
      <div className="absolute bottom-0 left-0 w-full p-1 bg-conic">
        {image && (
          <div className="mb-3 flex items-center gap-2">
            <div className="relative">
              <img
                src={image}
                alt=""
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
              <button
                onClick={removeImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
                type="button"
              >
                <IoMdCloseCircleOutline className="size-3" />
              </button>
            </div>
          </div>
        )}
        <hr className="border-accent mt-1" />
        <div className="flex items-center gap-2 w-full p-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />
          <button
            type="button"
            className={`btn btn-circle ${image ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <MdAddAPhoto size={20} className="text-base-content cursor-pointer" />
          </button>
          <form className="flex items-center gap-2 w-full" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={text}
              className="bg-base-300 rounded-lg px-2 py-1 outline-none flex-1"
              placeholder="Type a message..."
              onChange={(e) => setText(e.target.value)}
              disabled={isBlocked}
            />
            <div className="relative inline-block">
              <MdEmojiEmotions
                size={25}
                className="text-base-content font-bold cursor-pointer"
                onClick={() => setShowEmoji((prev) => !prev)}
              />
              {showEmoji && (
                <div className="absolute bottom-full right-0 mb-2 z-50">
                  <EmojiPicker onEmojiClick={handleEmoji} />
                </div>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-sm btn-circle"
              disabled={(!text.trim() && !image) || isBlocked}
            >
              <IoSend size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
