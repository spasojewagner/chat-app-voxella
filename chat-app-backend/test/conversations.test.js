import { describe, expect, it } from "vitest";
import { Message } from "../src/models/Message.js";
import { agentFor, chat, createUser, makeApp } from "./helpers.js";

describe("starting a conversation", () => {
  it("returns the same conversation however many times it is opened, from either side", async () => {
    const { app } = makeApp();
    const ana = await createUser();
    const luka = await createUser({ fullName: "Luka" });

    const first = await agentFor(app, ana).post("/api/conversations").send({ userId: String(luka._id) }).expect(200);
    const again = await agentFor(app, ana).post("/api/conversations").send({ userId: String(luka._id) }).expect(200);
    const otherSide = await agentFor(app, luka).post("/api/conversations").send({ userId: String(ana._id) }).expect(200);

    expect(again.body._id).toBe(first.body._id);
    expect(otherSide.body._id).toBe(first.body._id);
    expect(first.body).toMatchObject({ participant: { fullName: "Luka" }, lastMessage: null, unreadCount: 0 });
  });

  it("refuses yourself, unknown users and people who blocked you", async () => {
    const { app } = makeApp();
    const ana = await createUser();
    const blocker = await createUser({ blockedUsers: [] });
    blocker.blockedUsers.push(ana._id);
    await blocker.save();

    await agentFor(app, ana).post("/api/conversations").send({ userId: String(ana._id) }).expect(400);
    await agentFor(app, ana).post("/api/conversations").send({ userId: "0123456789abcdef01234567" }).expect(404);
    await agentFor(app, ana).post("/api/conversations").send({ userId: String(blocker._id) }).expect(404);
  });
});

describe("conversation list", () => {
  it("shows conversations with messages, newest first, with unread counts per person", async () => {
    const { app } = makeApp();
    const ana = await createUser({ fullName: "Ana" });
    const luka = await createUser({ fullName: "Luka" });
    const mia = await createUser({ fullName: "Mia" });
    const quiet = await createUser({ fullName: "Quiet" });

    await chat(app, luka, ana, ["one", "two"]);
    await chat(app, ana, mia, ["hey Mia"]);
    await agentFor(app, ana).post("/api/conversations").send({ userId: String(quiet._id) }).expect(200);

    const res = await agentFor(app, ana).get("/api/conversations").expect(200);

    expect(res.body.map((c) => c.participant.fullName)).toEqual(["Mia", "Luka"]);
    expect(res.body.map((c) => c.unreadCount)).toEqual([0, 2]);
    expect(res.body[1].lastMessage).toMatchObject({ text: "two", hasImage: false, senderId: String(luka._id) });

    const lukaView = await agentFor(app, luka).get("/api/conversations").expect(200);
    expect(lukaView.body[0].unreadCount).toBe(0);
  });

  it("does not let outsiders read a conversation or even learn that it exists", async () => {
    const { app } = makeApp();
    const ana = await createUser();
    const luka = await createUser();
    const outsider = await createUser();
    const { conversationId } = await chat(app, ana, luka, ["private"]);

    const as = agentFor(app, outsider);
    await as.get(`/api/conversations/${conversationId}`).expect(404);
    await as.get(`/api/conversations/${conversationId}/messages`).expect(404);
    await as.post(`/api/conversations/${conversationId}/messages`).send({ text: "hi" }).expect(404);
    await as.post(`/api/conversations/${conversationId}/read`).expect(404);
    await as.get(`/api/conversations/${conversationId}/media`).expect(404);
  });
});

describe("sending messages", () => {
  it("stores the message, updates the conversation and pushes it to both people", async () => {
    const { app, realtime } = makeApp();
    const ana = await createUser();
    const luka = await createUser();
    const { body: conversation } = await agentFor(app, ana)
      .post("/api/conversations")
      .send({ userId: String(luka._id) });

    const res = await agentFor(app, ana)
      .post(`/api/conversations/${conversation._id}/messages`)
      .send({ text: "  Hello Luka  ", clientId: "tmp-1" })
      .expect(201);

    expect(res.body.message).toMatchObject({ text: "Hello Luka", clientId: "tmp-1", readAt: null });
    expect(res.body.conversation.lastMessage.text).toBe("Hello Luka");

    const pushes = realtime.sent.filter((e) => e.event === "message:new");
    expect(pushes.map((e) => e.userId)).toEqual([String(luka._id), String(ana._id)]);
    // Each side gets the conversation from its own point of view.
    expect(pushes[0].payload.conversation).toMatchObject({ unreadCount: 1, participant: { _id: String(ana._id) } });
    expect(pushes[1].payload.conversation).toMatchObject({ unreadCount: 0, participant: { _id: String(luka._id) } });
    expect(pushes[0].payload.message.clientId).toBe("tmp-1");
  });

  it("accepts an image with an optional caption", async () => {
    const { app, storage } = makeApp();
    const ana = await createUser();
    const luka = await createUser();
    const { body: conversation } = await agentFor(app, ana)
      .post("/api/conversations")
      .send({ userId: String(luka._id) });

    const res = await agentFor(app, ana)
      .post(`/api/conversations/${conversation._id}/messages`)
      .field("text", "")
      .attach("image", Buffer.from("fake-jpeg"), { filename: "a.jpg", contentType: "image/jpeg" })
      .expect(201);

    expect(res.body.message.image).toMatch(/^\/uploads\/messages\/.+\.jpg$/);
    expect(storage.files.size).toBe(1);
    expect(res.body.conversation.lastMessage).toMatchObject({ hasImage: true, text: "" });

    const media = await agentFor(app, luka).get(`/api/conversations/${conversation._id}/media`).expect(200);
    expect(media.body).toHaveLength(1);
  });

  it("refuses empty and oversized messages", async () => {
    const { app } = makeApp();
    const ana = await createUser();
    const luka = await createUser();
    const { body: conversation } = await agentFor(app, ana)
      .post("/api/conversations")
      .send({ userId: String(luka._id) });
    const url = `/api/conversations/${conversation._id}/messages`;

    await agentFor(app, ana).post(url).send({ text: "   " }).expect(422);
    await agentFor(app, ana).post(url).send({ text: "x".repeat(4001) }).expect(422);
    expect(await Message.countDocuments()).toBe(0);
  });

  it("stops messages in both directions once either person blocks the other", async () => {
    const { app } = makeApp();
    const ana = await createUser();
    const luka = await createUser({ fullName: "Luka" });
    const { conversationId } = await chat(app, ana, luka, ["hi"]);

    await agentFor(app, ana).post(`/api/users/${luka._id}/block`).expect(200);

    const mine = await agentFor(app, ana).post(`/api/conversations/${conversationId}/messages`).send({ text: "x" }).expect(403);
    expect(mine.body).toMatchObject({ code: "BLOCKED_BY_YOU" });
    expect(mine.body.message).toContain("Luka");

    const theirs = await agentFor(app, luka).post(`/api/conversations/${conversationId}/messages`).send({ text: "x" }).expect(403);
    expect(theirs.body.code).toBe("BLOCKED");

    const view = await agentFor(app, luka).get(`/api/conversations/${conversationId}`).expect(200);
    expect(view.body).toMatchObject({ blockedMe: true, blockedByMe: false });
  });
});

describe("history", () => {
  it("pages backwards from the newest message", async () => {
    const { app } = makeApp();
    const ana = await createUser();
    const luka = await createUser();
    const texts = Array.from({ length: 7 }, (_, i) => `m${i + 1}`);
    const { conversationId } = await chat(app, ana, luka, texts);
    const url = `/api/conversations/${conversationId}/messages`;

    const page1 = await agentFor(app, luka).get(url).query({ limit: 3 }).expect(200);
    expect(page1.body.messages.map((m) => m.text)).toEqual(["m5", "m6", "m7"]);
    expect(page1.body.hasMore).toBe(true);

    const page2 = await agentFor(app, luka).get(url).query({ limit: 3, before: page1.body.messages[0]._id }).expect(200);
    expect(page2.body.messages.map((m) => m.text)).toEqual(["m2", "m3", "m4"]);

    const page3 = await agentFor(app, luka).get(url).query({ limit: 3, before: page2.body.messages[0]._id }).expect(200);
    expect(page3.body.messages.map((m) => m.text)).toEqual(["m1"]);
    expect(page3.body.hasMore).toBe(false);
  });
});

describe("read receipts", () => {
  it("marks the reader's messages as read, clears the badge and tells the sender", async () => {
    const { app, realtime } = makeApp();
    const ana = await createUser();
    const luka = await createUser();
    const { conversationId } = await chat(app, ana, luka, ["one", "two"]);
    await agentFor(app, luka).post(`/api/conversations/${conversationId}/messages`).send({ text: "reply" });
    realtime.sent.length = 0;

    const res = await agentFor(app, luka).post(`/api/conversations/${conversationId}/read`).expect(200);

    expect(res.body.updated).toBe(2);
    expect(await Message.countDocuments({ receiverId: luka._id, readAt: null })).toBe(0);
    // Ana's copy of Luka's reply stays unread until she opens the chat.
    expect(await Message.countDocuments({ receiverId: ana._id, readAt: null })).toBe(1);

    const receipts = realtime.sent.filter((e) => e.event === "conversation:read");
    expect(receipts.map((e) => e.userId)).toEqual([String(ana._id), String(luka._id)]);
    expect(receipts[0].payload).toMatchObject({ conversationId: String(conversationId), readerId: String(luka._id) });

    const list = await agentFor(app, luka).get("/api/conversations").expect(200);
    expect(list.body[0].unreadCount).toBe(0);
  });

  it("does not send a receipt to the other person when there was nothing new", async () => {
    const { app, realtime } = makeApp();
    const ana = await createUser();
    const luka = await createUser();
    const { conversationId } = await chat(app, ana, luka, ["one"]);
    await agentFor(app, luka).post(`/api/conversations/${conversationId}/read`);
    realtime.sent.length = 0;

    await agentFor(app, luka).post(`/api/conversations/${conversationId}/read`).expect(200);

    expect(realtime.sent.map((e) => e.userId)).toEqual([String(luka._id)]);
  });
});
