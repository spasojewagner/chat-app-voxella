import React, { useState } from 'react'
import Register from '../components/login/Register';
import Login from '../components/login/Login';
import img1 from '../assets/logo1.png'
import img2 from '../assets/login.jpg'
const Auth = () => {

  const [isRegister, setRegister]=useState(false);

  return (
    <div className='flex min-h-screen mb:flex-col '>
      {/**Left */}
      <div className='w-1/2 relative hidden md:flex items-center justify-center bg-cover'>

        {/**BG iMAGE */}
        <img className=' w-full  h-full object-cover' src={img2} alt="pzoadina" />
        {/*Black Overlay */}
        <div className="absolute inset-0  bg-opacity-80">

        {/**Qoute */}

        <blockquote className="  absolute bottom-10 px-8 mb-10 text-2xl italic text-white bg-[#3938389b] py-2 rounded-2xl">
        Messaging Made Simple, Connections Made Stronger!
          <br />
          <span className="block mt-4 text-yellow-400">- Founder of Voxella</span>
        </blockquote>
</div>
      </div>
      {/**Right deo */}
      <div className='w-full md:w-1/2 min-h-screen bg-[#4d0b54f9] p-10'>

      <div className='flex flex-col items-center '>
       <img src={img1} alt="logo" className=' h-25 border-2 rounded-full p-1'  /> 
      </div>
      <h2 className='text-4xl text-center mt-10 font-semibold text-yellow-400 mb-10'>{isRegister  ? "Registration": "Login"}</h2>
    {/**Delovi */}
    {isRegister? <Register setRegister={setRegister}/> : <Login/>}
    <div className='flex justify-center mt-6 gap-1'>
      <p className='mt-6.1text-sm text-gray-200'>{isRegister? "Already have an account?" : "Don't have an account?"}</p>
      <a onClick={()=>setRegister(!isRegister)} href="#" className='text-yellow-400 font-semibold hover:underline'>{isRegister? "Sing In":"Sing Up"}</a>
    </div>
      </div>
    </div>
  )
}

export default Auth;