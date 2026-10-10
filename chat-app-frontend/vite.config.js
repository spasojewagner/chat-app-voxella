import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // In development the API runs separately; proxying keeps everything on one origin,
  // so the strict SameSite session cookie and the websocket just work.
  const api = env.VITE_API_PROXY || "http://localhost:5000";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        "/api": api,
        "/uploads": api,
        "/socket.io": { target: api, ws: true },
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Libraries change less often than the app, so they get their own long-cached files.
          manualChunks(id) {
            if (/node_modules\/(react|react-dom|scheduler|react-router)\//.test(id)) return "react";
            if (/node_modules\/(socket\.io-client|engine\.io-client|socket\.io-parser|@socket\.io)\//.test(id)) return "realtime";
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.js"],
      css: false,
    },
  };
});
