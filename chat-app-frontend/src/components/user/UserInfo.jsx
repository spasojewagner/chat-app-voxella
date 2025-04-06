import React from 'react'
import img1 from '../../assets/korisnik.png'
import { IoIosMore } from "react-icons/io";
import { FaVideo } from "react-icons/fa";
import { FaRegEdit } from "react-icons/fa";
import { useAuthStore } from '../../store/useAuthStore';

export const UserInfo = () => {

  const { authUser } = useAuthStore();

  return (
    <div className='bg-base-200 border border-base-300 rounded-lg'>
      <div className='flex flex-col '>
        <div className='flex flex-col items-center justify-between p-4'>
          <h1 className='text-3xl font-semibold text-base-content'>Chats</h1>
        </div>
        <div className='flex items-center gap-3 p-2'>
          <img src={authUser?.profilePic} alt="" className='w-[50px] h-[50px] rounded-full' />
          <h1 className='text-xl font-medium text-primary'>{authUser?.fullName}</h1>
          <div className='flex items-center gap-3'>
            <IoIosMore className='text-base-content font-bold cursor-pointer' size={25} />
            <FaVideo className='text-base-content font-bold cursor-pointer' size={20} />
            <FaRegEdit className='text-base-content font-bold cursor-pointer' size={20} />
          </div>
        </div>
      </div>
    </div>
  )
}
