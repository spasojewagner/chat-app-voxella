import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { FaCamera, FaUser } from "react-icons/fa";
import { IoIosMail } from "react-icons/io";
import Header from "../components/Header";
import TopHeader from "../components/TopHeader";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", type: "" });
  
  // Kontrolisani inputi za status, ime i email
  const [status, setStatus] = useState(authUser?.status || "");
  const [name, setName] = useState(authUser?.fullName || "");
  const [email, setEmail] = useState(authUser?.email || "");

  useEffect(() => {
    // Ako se authUser promijeni, ažuriramo sve kontrole
    setStatus(authUser?.status || "");
    setName(authUser?.fullName || "");
    setEmail(authUser?.email || "");
  }, [authUser]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      // Ažuriramo profil sa novom slikom zajedno s postojećim podacima
      const result = await updateProfile({ profilePic: base64Image, status, fullName: name, email });
      if (result && result.success) {
        setSnackbar({ open: true, message: result.message, type: "success" });
      } else {
        setSnackbar({ open: true, message: "Profile update failed", type: "error" });
      }
    };
  };

  // Funkcija za spremanje promjena u ime, email i status
  const handleSaveProfile = async () => {
    const result = await updateProfile({ fullName: name, email, status });
    if (result && result.success) {
      setSnackbar({ open: true, message: result.message, type: "success" });
    } else {
      setSnackbar({ open: true, message: "Profile update failed", type: "error" });
    }
  };

  // Automatsko sakrivanje snackbar-a nakon 3 sekunde
  useEffect(() => {
    if (snackbar.open) {
      const timer = setTimeout(() => {
        setSnackbar({ ...snackbar, open: false });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [snackbar.open]);

  return (
    <>
      <TopHeader />
      <div className="h-[calc(100vh-5rem)] pt-20" data-theme="dark">
        <Header />
        <div className="max-w-2xl mx-auto p-4 py-8 rounded-2xl bg-[#333327]">
          <div className="bg-base-300 rounded-xl p-6 space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-white">Profile</h1>
              <p className="mt-2 text-white">Your profile information</p>
            </div>

            {/* Avatar upload section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <img
                  src={selectedImg || authUser?.profilePic || "./avatar.png"}
                  alt="Profile"
                  className="size-32 rounded-full object-cover border-4"
                />
                <label
                  htmlFor="avatar-upload"
                  className={`absolute bottom-0 right-0 bg-base-content hover:scale-105 p-2 rounded-full cursor-pointer transition-all duration-200 ${
                    isUpdatingProfile ? "animate-pulse pointer-events-none" : ""
                  }`}
                >
                  <FaCamera className="w-5 h-5 text-base-200" />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUpdatingProfile}
                  />
                </label>
              </div>
              <p className="text-sm text-zinc-400">
                {isUpdatingProfile
                  ? "Uploading..."
                  : "Click the camera icon to update your photo"}
              </p>
            </div>

            {/* Editable fields */}
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-sm text-zinc-400">Status</label>
                <input
                  type="text"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={isUpdatingProfile}
                  className="bg-base-300 rounded-lg px-4 py-2 outline-none w-full"
                  placeholder="Update your status..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-zinc-400">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isUpdatingProfile}
                  className="bg-base-300 rounded-lg px-4 py-2 outline-none w-full"
                  placeholder="Update your full name..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm text-zinc-400">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isUpdatingProfile}
                  className="bg-base-300 rounded-lg px-4 py-2 outline-none w-full"
                  placeholder="Update your email..."
                />
              </div>
            </div>

            {/* Save Changes Button */}
            <div className="mt-6">
              <button
                onClick={handleSaveProfile}
                disabled={isUpdatingProfile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
              >
                Save Changes
              </button>
            </div>

            <div className="mt-6 bg-base-300 rounded-xl p-6">
              <h2 className="text-lg font-medium mb-4 text-amber-50">Account Information</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                  <span>Member Since</span>
                  <span className="text-amber-50">{authUser?.createdAt?.split("T")[0]}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span>Account Status</span>
                  <span className="text-green-500">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {snackbar.open && (
          <div
            className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded ${
              snackbar.type === "success" ? "bg-green-500" : "bg-red-500"
            } text-white`}
          >
            {snackbar.message}
          </div>
        )}
      </div>
    </>
  );
};

export default ProfilePage;
