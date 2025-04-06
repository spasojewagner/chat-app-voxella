import React, { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router";
import { RiLoader3Fill } from "react-icons/ri";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const { login, isLoggingIn } = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData);
    if (result.success) {
      enqueueSnackbar("Login successful", { variant: "success" });
      navigate("/home");
    } else {
      enqueueSnackbar(result.message, { variant: "error" });
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* Email polje */}
        <div>
          <label className="block text-gray-50 mt-3 mb-2 text-sm font-medium">
            Email
          </label>
          <div className="flex items-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="bg-transparent flex-1 text-white focus:outline-none"
              required
            />
          </div>
        </div>
        {/* Password polje */}
        <div>
          <label className="block text-gray-50 mb-2 mt-3 text-sm font-medium">
            Password
          </label>
          <div className="flex items-center rounded-lg p-5 px-4 bg-[#1f1f1f]">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              className="bg-transparent flex-1 text-white focus:outline-none"
              required
            />
          </div>
        </div>
        {/* Dugme za login */}
        <button
          type="submit"
          className="w-full mt-6 py-3 text-lg bg-yellow-600 text-black font-bold hover:bg-amber-400"
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <>
              <RiLoader3Fill className="animate-spin mr-2" /> Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </div>
  );
};

export default Login;
