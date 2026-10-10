import "dotenv/config";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createLogger } from "./lib/logger.js";
import { createStorage } from "./lib/storage.js";
import { createRealtime } from "./realtime/socket.js";

const env = loadEnv();
const logger = createLogger(env.logLevel);

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "../../chat-app-frontend/dist");
const frontendDist = env.isProduction && fs.existsSync(path.join(dist, "index.html")) ? dist : null;

const storage = createStorage(env);
const realtime = createRealtime({ env, logger });
const app = createApp({ env, logger, storage, realtime, frontendDist });
const server = http.createServer(app);
realtime.attach(server);

await mongoose.connect(env.MONGO_URI);
logger.info({ db: mongoose.connection.name }, "MongoDB connected");

server.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, uploads: storage.kind, frontend: frontendDist ? "served" : "not served" },
    `VoxElla API listening on http://localhost:${env.PORT}`,
  );
});

async function shutdown(signal) {
  logger.info({ signal }, "shutting down");
  server.close();
  await realtime.close();
  await mongoose.disconnect();
  process.exit(0);
}
process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
