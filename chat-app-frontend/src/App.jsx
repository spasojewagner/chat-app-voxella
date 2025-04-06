import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { RiLoader3Fill } from "react-icons/ri";

import Home from './pages/Home';
import Header from './components/Header';
import Auth from './pages/Auth';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';


// Liste putanja gdje se Header NE prikazuje (Auth stranice)
const hideHeadersRoutes = ['/login', '/register'];

const Layout = () => {
  const location = useLocation();
  const hideHeader = hideHeadersRoutes.includes(location.pathname);

  return (
    <>
      {/* Prikazujemo Header samo ako trenutna putanja nije u hideHeadersRoutes */}
      {!hideHeader && <Header />}
      {/* Sadržaj */}
      <div className={!hideHeader ? 'ml-0 md:ml-[53px]' : ''}>
        <Outlet className=''/>
      </div>
    </>
  );
};

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme } = useThemeStore();

  //  console.log(onlineUsers)
  // console.log(authUser);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RiLoader3Fill className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#151515]" data-theme={theme}>
      <BrowserRouter>
        <Routes>
          {/* Rute unutar Layouta */}
          <Route element={<Layout />}>
            {/* Zaštićene rute: ako korisnik nije autentifikovan, Navigate preusmjerava na /login */}
            <Route path="/home" element={authUser ? <Home /> : <Navigate to="/login" />} />
            <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
            <Route path="/settings" element={authUser ? <SettingsPage /> : <Navigate to="/login" />} />
          </Route>

          {/* Autentifikacione rute: ako je korisnik ulogovan, preusmjeri ga na /home */}
          <Route path="/login" element={!authUser ? <Auth /> : <Navigate to="/home" />} />
          <Route path="/register" element={!authUser ? <Auth /> : <Navigate to="/home" />} />

          {/* Defaultno preusmjeravanje */}
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;
