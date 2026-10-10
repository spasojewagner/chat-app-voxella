import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";
import { createLogger } from "../src/lib/logger.js";
import { memoryStorage } from "../src/lib/storage.js";
import { User } from "../src/models/User.js";
import { createNullRealtime } from "../src/realtime/socket.js";
import { agentFor, createUser, env, makeApp, PASSWORD } from "./helpers.js";

const cookieFrom = (res) => res.headers["set-cookie"]?.find((c) => c.startsWith("jwt="));

describe("register", () => {
  it("creates the account, signs the user in with a strict httpOnly cookie and hides the password", async () => {
    const { app } = makeApp();

    const res = await request(app)
      .post("/api/auth/register")
      .send({ fullName: "  Ana Petrović ", email: "Ana@Example.TEST", password: "s3cret-pass" })
      .expect(201);

    expect(res.body).toMatchObject({ fullName: "Ana Petrović", email: "ana@example.test" });
    expect(res.body).not.toHaveProperty("password");
    const cookie = cookieFrom(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);

    const stored = await User.findOne({ email: "ana@example.test" }).select("+password");
    expect(stored.password).not.toBe("s3cret-pass");
  });

  it("rejects a second account with the same email, whatever the case", async () => {
    const { app } = makeApp();
    await createUser({ email: "taken@example.test" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ fullName: "Someone", email: "TAKEN@example.test", password: "s3cret-pass" })
      .expect(409);

    expect(res.body.code).toBe("EMAIL_TAKEN");
  });

  it("explains every invalid field", async () => {
    const { app } = makeApp();

    const res = await request(app)
      .post("/api/auth/register")
      .send({ fullName: "A", email: "not-an-email", password: "short" })
      .expect(422);

    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(res.body.issues.map((i) => i.path)).toEqual(["body.fullName", "body.email", "body.password"]);
  });
});

describe("login", () => {
  it("signs in with the right password", async () => {
    const { app } = makeApp();
    const user = await createUser({ email: "mia@example.test" });

    const res = await request(app).post("/api/auth/login").send({ email: "MIA@example.test", password: PASSWORD }).expect(200);

    expect(res.body._id).toBe(String(user._id));
    expect(res.body).not.toHaveProperty("password");
    expect(cookieFrom(res)).toBeDefined();
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const { app } = makeApp();
    await createUser({ email: "mia@example.test" });

    const wrongPassword = await request(app).post("/api/auth/login").send({ email: "mia@example.test", password: "nope" });
    const unknownEmail = await request(app).post("/api/auth/login").send({ email: "who@example.test", password: "nope" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(cookieFrom(wrongPassword)).toBeUndefined();
  });
});

describe("session", () => {
  it("returns the signed-in user", async () => {
    const { app } = makeApp();
    const user = await createUser();

    const res = await agentFor(app, user).get("/api/auth/me").expect(200);

    expect(res.body.email).toBe(user.email);
  });

  it("rejects requests without a cookie, with a forged token and for deleted users", async () => {
    const { app } = makeApp();
    const user = await createUser();
    const forged = jwt.sign({ sub: String(user._id) }, "some-other-secret");

    await request(app).get("/api/auth/me").expect(401);
    await request(app).get("/api/auth/me").set("Cookie", `jwt=${forged}`).expect(401);

    const agent = agentFor(app, user);
    await User.deleteOne({ _id: user._id });
    await agent.get("/api/auth/me").expect(401);
  });

  it("still accepts tokens issued by v1, which carried userId instead of sub", async () => {
    const { app } = makeApp();
    const user = await createUser();
    const legacy = jwt.sign({ userId: String(user._id) }, env.JWT_SECRET, { expiresIn: "1d" });

    await request(app).get("/api/auth/me").set("Cookie", `jwt=${legacy}`).expect(200);
  });

  it("logs out by expiring the cookie with the same attributes it was set with", async () => {
    const { app } = makeApp();

    const res = await request(app).post("/api/auth/logout").expect(204);

    const cookie = cookieFrom(res);
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
  });
});

describe("API basics", () => {
  it("answers unknown API routes and bad JSON with JSON errors", async () => {
    const { app } = makeApp();

    const missing = await request(app).get("/api/nope").expect(404);
    expect(missing.body.code).toBe("NOT_FOUND");

    const badJson = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email":')
      .expect(400);
    expect(badJson.body.message).toMatch(/not valid JSON/);
  });

  it("sends security headers", async () => {
    const { app } = makeApp();

    const res = await request(app).get("/api/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("cross-site deployments", () => {
  it("issues a SameSite=None; Secure cookie when the frontend lives on another origin", async () => {
    const crossEnv = loadEnv({ NODE_ENV: "test", MONGO_URI: "mongodb://unused", JWT_SECRET: env.JWT_SECRET, CORS_ORIGIN: "https://app.example.com" });
    const app = createApp({ env: crossEnv, logger: createLogger("silent"), storage: memoryStorage(), realtime: createNullRealtime() });
    await createUser({ email: "cross@example.test" });

    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://app.example.com")
      .send({ email: "cross@example.test", password: PASSWORD })
      .expect(200);

    expect(cookieFrom(res)).toMatch(/SameSite=None/i);
    expect(cookieFrom(res)).toMatch(/Secure/i);
    expect(res.headers["access-control-allow-origin"]).toBe("https://app.example.com");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });
});
