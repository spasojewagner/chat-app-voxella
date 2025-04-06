// Header.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BsChatDotsFill } from "react-icons/bs";
import { IoMdPeople } from "react-icons/io";
import img1 from '../assets/logo1.png';
import { IoSettingsSharp } from "react-icons/io5";
import { IoIosNotifications } from "react-icons/io";
import { RiShutDownLine } from "react-icons/ri";
import { FaUserCircle } from "react-icons/fa";
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { useChatStore } from '../store/useChatStore';

const Header = () => {
  const { logout } = useAuthStore();
  const { theme } = useThemeStore();
  const { selectedUser, setSelectedUser } = useChatStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobilni header – vidljiv samo ispod md, prikazuje se samo kada chat nije otvoren */}
      {!selectedUser && (
        <div
          data-theme={theme}
          className="md:hidden fixed bottom-0 left-0 right-0 bg-base-200 p-2 flex justify-around shadow-t z-50"
        >
          <button onClick={() => setSelectedUser(null)}>
            <BsChatDotsFill size={25} 
           onClick={() => navigate("/home")}/>
          </button>
          {/* <button>
            <IoMdPeople size={25} />
          </button>
          <button>
            <IoIosNotifications size={25}    onClick={() => navigate("/notifications")} />
          </button> */}
          <button onClick={() => navigate("/profile")}>
            <FaUserCircle size={25} />
          </button>
          <button onClick={() => navigate("/settings")}>
            <IoSettingsSharp size={25} />
          </button>
          <button onClick={handleLogout}>
            <RiShutDownLine size={25} />
          </button>
        </div>
      )}

      {/* Desktop sidebar – vidljiv samo na md i većim uređajima, uvek prikazan */}
      <div
        data-theme={theme}
        className="hidden md:flex fixed top-0 left-0 h-screen p-2 bg-base-200 flex-col justify-between shadow-r z-50"
      >
        <div>
          <button onClick={() => navigate("/home")}>
            <img className="w-10 h-10 rounded" src={img1} alt="Logo" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-6">
          <button onClick={() => navigate("/chatlist")}>
            <BsChatDotsFill size={25} />
          </button>
          {/* <button>
            <IoMdPeople size={25} />
          </button>
          <button>
            <IoIosNotifications size={25} />
          </button> */}
        </div>
        <div className="flex flex-col items-center gap-6">
          <button onClick={() => navigate("/profile")}>
            <FaUserCircle size={25} />
          </button>
          <button onClick={() => navigate("/settings")}>
            <IoSettingsSharp size={25} />
          </button>
          <button onClick={handleLogout}>
            <RiShutDownLine size={25} />
          </button>
        </div>
      </div>
    </>
  );
};

export default Header;
