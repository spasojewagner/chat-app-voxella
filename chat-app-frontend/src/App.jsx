import { useEffect } from "react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from "react-router";
import { Toaster } from "sonner";
import { LogoMark } from "./components/ui/Logo.jsx";
import { useThemeEffect } from "./hooks/useThemeEffect.js";
import AuthPage from "./pages/AuthPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import { SessionLayout } from "./components/SessionLayout.jsx";
import { useAuth } from "./stores/auth.js";

function RequireAuth() {
  const status = useAuth((s) => s.status);
  const location = useLocation();
  if (status !== "authenticated") return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <SessionLayout />;
}

function GuestOnly() {
  const status = useAuth((s) => s.status);
  const location = useLocation();
  if (status === "authenticated") return <Navigate to={location.state?.from ?? "/"} replace />;
  return <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      { path: "/login", element: <AuthPage mode="login" /> },
      { path: "/register", element: <AuthPage mode="register" /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: "/", element: <ChatPage /> },
      { path: "/c/:conversationId", element: <ChatPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

function Splash() {
  return (
    <div className="grid h-full place-items-center">
      <LogoMark className="size-12 animate-pulse" />
    </div>
  );
}

export default function App() {
  const status = useAuth((s) => s.status);
  const restore = useAuth((s) => s.restore);
  const theme = useThemeEffect();

  useEffect(() => {
    restore();
  }, [restore]);

  return (
    <>
      {status === "checking" ? <Splash /> : <RouterProvider router={router} />}
      <Toaster position="top-center" theme={theme} richColors closeButton />
    </>
  );
}
