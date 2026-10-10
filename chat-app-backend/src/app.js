import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { pinoHttp } from "pino-http";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { apiLimiter } from "./middleware/rate-limit.js";
import { authRoutes } from "./routes/auth.js";
import { conversationRoutes } from "./routes/conversations.js";
import { userRoutes } from "./routes/users.js";

/**
 * Builds the Express app. Everything it talks to is passed in, so tests can use an in-memory
 * storage and a fake realtime layer.
 */
export function createApp({ env, logger, storage, realtime, frontendDist = null }) {
  const app = express();
  const rateLimits = env.isTest ? { auth: 10_000, api: 100_000 } : { auth: 20, api: 600 };

  if (env.isProduction) app.set("trust proxy", 1); // Render and similar hosts sit behind one proxy
  app.disable("x-powered-by");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
          "connect-src": ["'self'", "ws:", "wss:"],
          // The host terminates TLS; locally the built app is served over plain http.
          "upgrade-insecure-requests": null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  if (env.corsOrigins.length) app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/api/health" } }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    const db = mongoose.connection.readyState === 1 ? "up" : "down";
    res.status(db === "up" ? 200 : 503).json({ status: db === "up" ? "ok" : "degraded", db });
  });

  app.use("/api", apiLimiter(rateLimits.api));
  app.use("/api/auth", authRoutes({ env, rateLimits }));
  app.use("/api/users", userRoutes({ env, storage, realtime }));
  app.use("/api/conversations", conversationRoutes({ env, storage, realtime }));
  app.use("/api", notFoundHandler);

  if (storage.kind === "disk") {
    app.use("/uploads", express.static(storage.root, { maxAge: "30d", immutable: true, fallthrough: false }));
  }

  if (frontendDist) {
    // Vite puts a content hash in every asset name, so they can be cached forever.
    app.use("/assets", express.static(path.join(frontendDist, "assets"), { maxAge: "1y", immutable: true }));
    app.use(express.static(frontendDist, { index: false, maxAge: "1h" }));
    // Client-side routes (/c/:id, /settings, ...) all load the SPA.
    app.get("/{*path}", (_req, res) => res.sendFile(path.join(frontendDist, "index.html")));
  }

  app.use(errorHandler);
  return app;
}
