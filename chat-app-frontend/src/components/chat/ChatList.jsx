// ChatList.jsx
import React, { useEffect, useState } from 'react';
import { FaSearch } from "react-icons/fa";
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useDebounce } from '../../constance';

const ChatList = () => {
  const { getUsers, users = [], selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnline, setShowOnline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Primenjujemo debounce na pretragu (300ms)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Filtriramo korisnike
  const onlineFilteredUsers = showOnline 
    ? users.filter(user => onlineUsers.includes(user._id))
    : users;

  const filteredUsers = onlineFilteredUsers.filter(user =>
    user.fullName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  if (isUsersLoading) return <div>Loading...</div>;
  if (!Array.isArray(users)) return <div>No users found</div>;

  return (
    <div className="bg-base-200 p-3 border border-base-300 rounded-lg flex flex-col h-full">
      {/* Gornji deo – pretraga */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="flex items-center gap-2 w-full">
          <FaSearch size={20} className="text-base-content" />
          <input
            type="text"
            className="bg-base-300 rounded-lg px-2 py-1 flex-1"
            placeholder="Search by name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnline}
              onChange={(e) => setShowOnline(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span>Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      {/* Lista korisnika */}
      <div className="flex-1 overflow-y-auto">
        {filteredUsers.map(user => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300 rounded-lg" : ""}`}
          >
            <div className="relative">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.fullName}
                className="w-10 h-10 object-cover rounded-full"
              />
              <span
                className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-base-100 
                ${onlineUsers.includes(user._id) ? "bg-green-500" : "bg-gray-500"}`}
              />
            </div>
            <div className="text-left">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-xs text-gray-500">
                {onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
