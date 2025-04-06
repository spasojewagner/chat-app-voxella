import React, { useState } from 'react'
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { IoMdDownload } from "react-icons/io";
import { useAuthStore } from '../../store/useAuthStore';
import { useChatStore } from '../../store/useChatStore';
import BlockButton from '../BlockButton';
// Import helper funkcije za download, ili je ubaci direktno u fajl
import { handleDownload } from '../../constance/index'; 

const Details = () => {
  const { messages, selectedUser } = useChatStore();
  const { authUser } = useAuthStore();

  const [addMode, setAddMode] = useState(true);

  const handleChange = () => {
    setAddMode(!addMode);
  };

  // Filtriramo poruke koje imaju sliku i pripadaju komunikaciji između authUser i selectedUser
  const sharedImages = messages.filter((msg) => {
    if (!msg.image) return false;
    const isBetweenTheseTwo = 
      (msg.senderId === authUser._id && msg.receiverId === selectedUser._id) ||
      (msg.senderId === selectedUser._id && msg.receiverId === authUser._id);
    return isBetweenTheseTwo;
  });

  return (
    <div className="h-[calc(100vh-35rem)] p-4">
      {/* Gornji deo - info o selectedUser */}
      <div className="flex flex-col items-center gap-2">
        {/* Na telefonu (default) veća slika, na desktopu (md:) manja */}
        <img
          src={selectedUser?.profilePic || "avatar.png"}
          alt=""
          className="w-20 h-20 md:w-18 md:h-18 rounded-full"
        />
        {/* Na telefonu veći font, na desktopu nešto manji */}
        <h1 className="text-primary font-semibold text-3xl md:text-2xl">
          {selectedUser?.fullName}
        </h1>
        <p className="font-light p-1 text-lg md:text-base">
          {selectedUser?.status}
        </p>
      </div>

      <hr className="border-base-300 mt-2" />

      {/* Donji deo - razne sekcije */}
      <div className="mt-3 flex flex-col items-center">
        {/* Chat Settings */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base-content text-xl md:text-base">
            Chat Settings
          </span>
          <p onClick={handleChange}>
            {addMode ? (
              <IoIosArrowDown 
                className="text-base-content m-1 rounded-2xl bg-base-300 text-[20px] md:text-[17px]" 
              />
            ) : (
              <IoIosArrowUp 
                className="text-base-content m-1 rounded-2xl bg-base-300 text-[20px] md:text-[17px]" 
              />
            )}
          </p>
        </div>

        {/* Privacy & Help */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base-content text-xl md:text-base">
            Privacy & Help
          </span>
          <p onClick={handleChange}>
            {addMode ? (
              <IoIosArrowDown 
                className="text-base-content m-1 rounded-2xl bg-base-300 text-[20px] md:text-[17px]" 
              />
            ) : (
              <IoIosArrowUp 
                className="text-base-content m-1 rounded-2xl bg-base-300 text-[20px] md:text-[17px]" 
              />
            )}
          </p>
        </div>

        {/* Shared photos */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base-content text-xl md:text-base">
            Shared photos
          </span>
          <p onClick={handleChange}>
            {addMode ? (
              <IoIosArrowDown 
                className="text-base-content m-1 rounded-2xl bg-base-300 text-[20px] md:text-[17px]" 
              />
            ) : (
              <IoIosArrowUp 
                className="text-base-content m-1 rounded-2xl bg-base-300 text-[20px] md:text-[17px]" 
              />
            )}
          </p>
        </div>

        {/* Mapa zajedničkih slika */}
        <div className="flex flex-col gap-2 h-[calc(100vh-30rem)] overflow-y-auto scroll-smooth scrollbar-hide">
          {sharedImages.length > 0 ? (
            sharedImages.map((msg, idx) => {
              // Primer: generišemo ime fajla, ali možeš čuvati originalName
              const fileName = `photo_${idx}.png`;
              return (
                <div className="flex gap-8 items-center" key={msg._id}>
                  {/* Veća slika na mobilu, manja na desktopu */}
                  <img
                    src={msg.image}
                    alt=""
                    className="w-16 h-16 md:w-12 md:h-12 rounded-xl object-cover"
                  />
                  <span className="text-base-content text-xl md:text-base">
                    {fileName}
                  </span>
                  <IoMdDownload
                    className="text-base-content m-1 rounded-2xl cursor-pointer text-[20px] md:text-[17px]"
                    onClick={() => handleDownload(msg.image, fileName)}
                  />
                </div>
              );
            })
          ) : (
            <p className="text-sm text-base-content/50">
              No shared photos yet.
            </p>
          )}
        </div>

        <hr className="border-base-300 w-70" />

        <div className="flex flex-col items-stretch mt-8">
          {/* Primer dugmeta za block/unblock */}
          {selectedUser && authUser && selectedUser._id !== authUser._id && (
            <BlockButton targetUserId={selectedUser._id} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Details;
