import React from 'react';
import { useAuthStore } from '../store/useAuthStore';

const BlockButton = ({ targetUserId }) => {
  const { authUser, blockUser, unblockUser } = useAuthStore();
  // Ako ti (authUser) blokiraš targetUser, onda targetUser je u tvom blockedUsers nizu.
  const isBlocked = authUser?.blockedUsers?.includes(targetUserId);

  const handleBlockToggle = async () => {
    if (isBlocked) {
      await unblockUser(targetUserId);
    } else {
      await blockUser(targetUserId);
    }
  };

  return (
    <button 
      onClick={handleBlockToggle} 
      className="font-semibold text-primary bg-error px-12 py-1 rounded-2xl hover:bg-error-focus transition duration-200 cursor-pointer"
    >
      {isBlocked ? "Unblock User" : "Block User"}
    </button>
  );
};

export default BlockButton;
