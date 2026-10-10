import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";
import { signToken } from "../src/lib/auth-token.js";
import { createLogger } from "../src/lib/logger.js";
import { memoryStorage } from "../src/lib/storage.js";
import { createNullRealtime } from "../src/realtime/socket.js";
import { User } from "../src/models/User.js";

export const PASSWORD = "correct-horse-battery";
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

export const env = loadEnv({ NODE_ENV: "test", MONGO_URI: "mongodb://unused", JWT_SECRET: "test-secret-0123456789abcdef" });

export function makeApp({ realtime = createNullRealtime(), storage = memoryStorage() } = {}) {
  const app = createApp({ env, logger: createLogger("silent"), storage, realtime });
  return { app, realtime, storage };
}

let counter = 0;
export async function createUser(overrides = {}) {
  counter += 1;
  return User.create({
    fullName: `User ${counter}`,
    email: `user${counter}@example.test`,
    password: PASSWORD_HASH,
    ...overrides,
  });
}

/** A supertest agent that carries the user's session cookie. */
export function agentFor(app, user) {
  const agent = request.agent(app);
  agent.set("Cookie", `jwt=${signToken(user._id, env)}`);
  return agent;
}

export function authCookie(user) {
  return `jwt=${signToken(user._id, env)}`;
}

/** Creates a conversation between two users by having `from` send `count` messages. */
export async function chat(app, from, to, texts) {
  const agent = agentFor(app, from);
  const { body: conversation } = await agent.post("/api/conversations").send({ userId: String(to._id) }).expect(200);
  const sent = [];
  for (const text of texts) {
    const res = await agent.post(`/api/conversations/${conversation._id}/messages`).send({ text }).expect(201);
    sent.push(res.body.message);
  }
  return { conversationId: conversation._id, sent };
}
