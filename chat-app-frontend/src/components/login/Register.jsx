import React, { useState } from 'react';
import { useSnackbar } from 'notistack';
import { useAuthStore } from '../../store/useAuthStore';
import { RiLoader3Fill } from 'react-icons/ri';

const Register = () => {
  const { enqueueSnackbar } = useSnackbar();

  // State za formu – avatar se ne šalje pri registraciji
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  // Handler za polja u formi
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const { register, isSigningUp } = useAuthStore();

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      enqueueSnackbar("Full name is required", { variant: "error" });
      return false;
    }
    if (!formData.email.trim()) {
      enqueueSnackbar("Email is required", { variant: "error" });
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      enqueueSnackbar("Invalid email format", { variant: "error" });
      return false;
    }
    if (!formData.password) {
      enqueueSnackbar("Password is required", { variant: "error" });
      return false;
    }
    if (formData.password.length < 6) {
      enqueueSnackbar("Password must be at least 6 characters", { variant: "error" });
      return false;
    }
    const trimmedName = formData.fullName.trim();
    if (trimmedName.length > 20) {
      enqueueSnackbar("Name must be at most 20 characters long", { variant: "error" });
      return false;
    }
    if (!trimmedName.includes(" ")) {
      enqueueSnackbar("Please enter both first name and last name", { variant: "error" });
      return false;
    }
    return true;
  };

  // Handler za submit forme
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      const result = await register(formData);
      if (result.success) {
        enqueueSnackbar(result.message, { variant: "success" });
      } else {
        enqueueSnackbar(result.message, { variant: "error" });
      }
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* Polje za ime */}
        <div>
          <label className='block text-gray-50 mt-3 mb-2 text-sm font-medium'>Name</label>
          <div className='flex items-center rounded-lg p-5 px-4 bg-[#1f1f1f]'>
            <input
              type="text"
              name='fullName'
              value={formData.fullName}
              onChange={handleChange}
              placeholder='Enter your full name'
              className='bg-transparent flex-1 text-white focus:outline-none'
              required
            />
          </div>
        </div>
        {/* Polje za email */}
        <div>
          <label className='block text-gray-50 mt-3 mb-2 text-sm font-medium'>Email</label>
          <div className='flex items-center rounded-lg p-5 px-4 bg-[#1f1f1f]'>
            <input
              type="email"
              name='email'
              value={formData.email}
              onChange={handleChange}
              placeholder='Enter your email'
              className='bg-transparent flex-1 text-white focus:outline-none'
              required
            />
          </div>
        </div>
        {/* Polje za lozinku */}
        <div>
          <label className='block text-gray-50 mb-2 mt-3 text-sm font-medium'>Password</label>
          <div className='flex items-center rounded-lg p-5 px-4 bg-[#1f1f1f]'>
            <input
              type="password"
              name='password'
              value={formData.password}
              onChange={handleChange}
              placeholder='Enter password'
              className='bg-transparent flex-1 text-white focus:outline-none'
              required
            />
          </div>
        </div>
        {/* 
          Napomena: Ako trenutno ne šalješ sliku pri registraciji,
          možeš ukloniti ili zakomentarisati dio s avatarom. 
          Slika se može kasnije postaviti u update profilu.
        */}
        <button
          type="submit"
          className="w-full mt-6 py-3 text-lg bg-yellow-600 text-black font-bold hover:bg-amber-400 cursor-pointer"
          disabled={isSigningUp}
        >
          {isSigningUp ? (
            <>
              <RiLoader3Fill className='animate-spin mr-2' /> Registering...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>
    </div>
  );
};

export default Register;
