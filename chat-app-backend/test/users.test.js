import request from "supertest";
import { describe, expect, it } from "vitest";
import { User } from "../src/models/User.js";
import { agentFor, chat, createUser, makeApp, PASSWORD } from "./helpers.js";

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010806000000" + "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
  "hex",
);

describe("people search", () => {
  it("matches names case-insensitively and emails only exactly, never returning yourself", async () => {
    const { app } = makeApp();
    const me = await createUser({ fullName: "Ana Petrović" });
    await createUser({ fullName: "Luka Jovanović", email: "luka@example.test" });
    await createUser({ fullName: "Mia Novak", email: "mia@example.test" });

    const byName = await agentFor(app, me).get("/api/users").query({ search: "JOVAN" }).expect(200);
    expect(byName.body.map((u) => u.fullName)).toEqual(["Luka Jovanović"]);

    const byEmail = await agentFor(app, me).get("/api/users").query({ search: "mia@example.test" }).expect(200);
    expect(byEmail.body.map((u) => u.fullName)).toEqual(["Mia Novak"]);

    const partialEmail = await agentFor(app, me).get("/api/users").query({ search: "@example.test" }).expect(200);
    expect(partialEmail.body).toEqual([]);

    const self = await agentFor(app, me).get("/api/users").query({ search: "Ana" }).expect(200);
    expect(self.body).toEqual([]);
  });

  it("returns public profiles only and treats regex characters literally", async () => {
    const { app } = makeApp();
    const me = await createUser();
    await createUser({ fullName: "Dot.Name" });
    await createUser({ fullName: "DotXName" });

    const res = await agentFor(app, me).get("/api/users").query({ search: "Dot." }).expect(200);

    expect(res.body.map((u) => u.fullName)).toEqual(["Dot.Name"]);
    expect(Object.keys(res.body[0]).sort()).toEqual(["_id", "fullName", "isOnline", "lastSeenAt", "profilePic", "status"]);
  });

  it("hides people who blocked you", async () => {
    const { app } = makeApp();
    const me = await createUser();
    const blocker = await createUser({ fullName: "Blocker" });
    blocker.blockedUsers.push(me._id);
    await blocker.save();

    const res = await agentFor(app, me).get("/api/users").expect(200);
    expect(res.body.map((u) => u.fullName)).not.toContain("Blocker");
    await agentFor(app, me).get(`/api/users/${blocker._id}`).expect(404);
  });
});

describe("profile", () => {
  it("updates name and status and tells the people you chat with", async () => {
    const { app, realtime } = makeApp();
    const me = await createUser();
    const friend = await createUser();
    const stranger = await createUser();
    await chat(app, me, friend, ["hi"]);

    const res = await agentFor(app, me).patch("/api/users/me").send({ fullName: "New Name", status: "Busy" }).expect(200);

    expect(res.body).toMatchObject({ fullName: "New Name", status: "Busy" });
    const updates = realtime.sent.filter((e) => e.event === "user:updated");
    expect(updates.map((e) => e.userId)).toEqual([String(friend._id)]);
    expect(updates[0].payload.user).toMatchObject({ fullName: "New Name" });
    expect(updates.map((e) => e.userId)).not.toContain(String(stranger._id));
  });

  it("refuses an email that belongs to someone else and an empty update", async () => {
    const { app } = makeApp();
    const me = await createUser();
    await createUser({ email: "taken@example.test" });

    const taken = await agentFor(app, me).patch("/api/users/me").send({ email: "Taken@example.test" }).expect(409);
    expect(taken.body.code).toBe("EMAIL_TAKEN");

    await agentFor(app, me).patch("/api/users/me").send({}).expect(422);
  });

  it("uploads a profile photo through the storage adapter", async () => {
    const { app, storage } = makeApp();
    const me = await createUser();

    const res = await agentFor(app, me)
      .put("/api/users/me/avatar")
      .attach("avatar", PNG, { filename: "me.png", contentType: "image/png" })
      .expect(200);

    expect(res.body.profilePic).toMatch(/^\/uploads\/avatars\/.+\.png$/);
    expect(storage.files.get(res.body.profilePic).buffer.equals(PNG)).toBe(true);
  });

  it("rejects files that are not images or are too large", async () => {
    const { app } = makeApp();
    const me = await createUser();

    const text = await agentFor(app, me)
      .put("/api/users/me/avatar")
      .attach("avatar", Buffer.from("hello"), { filename: "x.txt", contentType: "text/plain" })
      .expect(415);
    expect(text.body.message).toMatch(/JPG, PNG/);

    await agentFor(app, me)
      .put("/api/users/me/avatar")
      .attach("avatar", Buffer.alloc(5 * 1024 * 1024 + 1), { filename: "big.png", contentType: "image/png" })
      .expect(413);
  });

  it("changes the password only with the current one", async () => {
    const { app } = makeApp();
    const me = await createUser({ email: "me@example.test" });

    await agentFor(app, me)
      .put("/api/users/me/password")
      .send({ currentPassword: "wrong", newPassword: "brand-new-pass" })
      .expect(422);
    await agentFor(app, me)
      .put("/api/users/me/password")
      .send({ currentPassword: PASSWORD, newPassword: "brand-new-pass" })
      .expect(204);

    await request(app).post("/api/auth/login").send({ email: "me@example.test", password: PASSWORD }).expect(401);
    await request(app).post("/api/auth/login").send({ email: "me@example.test", password: "brand-new-pass" }).expect(200);
  });
});

describe("blocking", () => {
  it("blocks and unblocks, and only the two people involved are notified", async () => {
    const { app, realtime } = makeApp();
    const me = await createUser();
    const target = await createUser();
    await createUser();

    const blocked = await agentFor(app, me).post(`/api/users/${target._id}/block`).expect(200);
    expect(blocked.body.blockedByMe).toBe(true);
    expect((await User.findById(me._id)).hasBlocked(target._id)).toBe(true);

    expect(realtime.sent.filter((e) => e.event === "block:updated")).toEqual([
      { userId: String(target._id), event: "block:updated", payload: { userId: String(me._id), blockedMe: true } },
      { userId: String(me._id), event: "block:updated", payload: { userId: String(target._id), blockedByMe: true } },
    ]);

    const list = await agentFor(app, me).get("/api/users/me/blocked").expect(200);
    expect(list.body.map((u) => u._id)).toEqual([String(target._id)]);

    await agentFor(app, me).delete(`/api/users/${target._id}/block`).expect(200);
    expect((await User.findById(me._id)).hasBlocked(target._id)).toBe(false);
  });

  it("does not let you block yourself or a user that does not exist", async () => {
    const { app } = makeApp();
    const me = await createUser();

    await agentFor(app, me).post(`/api/users/${me._id}/block`).expect(400);
    await agentFor(app, me).post("/api/users/0123456789abcdef01234567/block").expect(404);
    await agentFor(app, me).post("/api/users/not-an-id/block").expect(422);
  });
});
