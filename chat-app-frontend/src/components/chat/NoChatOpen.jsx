import React, { useEffect, useRef, useState } from 'react'
import { TiMessages } from "react-icons/ti";

const NoChatOpen = () => {

  return (
    <div className=" items-center justify-center h-[calc(100vh-5.5rem)] flex flex-col gap-2">
      <TiMessages  size={40} className='text-primary animate-bounce' />
      <h1 className='text-2xl '>Welcome to VoxElla</h1>
      <p className='text-sm'>Select a conversation from the sidebar to start chatting!</p>
    </div>
  );
};

export default NoChatOpen;
