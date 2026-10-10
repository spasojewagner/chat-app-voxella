import http from "node:http";
import { io as connect } from "socket.io-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLogger } from "../src/lib/logger.js";
import { createRealtime } from "../src/realtime/socket.js";
import { User } from "../src/models/User.js";
import { agentFor, authCookie, chat, createUser, env, makeApp } from "./helpers.js";

let server;
let realtime;
let app;
let url;
const clients = [];

beforeEach(async () => {
  realtime = createRealtime({ env, logger: createLogger("silent") });
  ({ app } = makeApp({ realtime }));
  server = http.createServer(app);
  realtime.attach(server);
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  await realtime.close();
  await new Promise((resolve) => server.close(resolve));
});

function client(cookie) {
  const socket = connect(url, {
    transports: ["websocket"],
    extraHeaders: cookie ? { cookie } : {},
    reconnection: false,
    forceNew: true,
  });
  clients.push(socket);
  return socket;
}

const once = (socket, event, ms = 2000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no "${event}" within ${ms}ms`)), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

/** Resolves with every `event` received during `ms`. */
const collect = (socket, event, ms = 300) =>
  new Promise((resolve) => {
    const seen = [];
    const handler = (payload) => seen.push(payload);
    socket.on(event, handler);
    setTimeout(() => {
      socket.off(event, handler);
      resolve(seen);
    }, ms);
  });

async function online(user) {
  const socket = client(authCookie(user));
  await once(socket, "presence:snapshot");
  return socket;
}

describe("socket authentication", () => {
  it("refuses connections without a valid session cookie", async () => {
    const user = await createUser();

    const anonymous = await once(client(null), "connect_error");
    expect(anonymous.message).toBe("UNAUTHENTICATED");

    const forged = await once(client("jwt=not-a-token"), "connect_error");
    expect(forged.message).toBe("UNAUTHENTICATED");

    // v1 trusted ?userId= in the handshake, which let anyone listen in as anyone.
    const spoofed = connect(`${url}?userId=${user._id}`, { transports: ["websocket"], reconnection: false, forceNew: true });
    clients.push(spoofed);
    expect((await once(spoofed, "connect_error")).message).toBe("UNAUTHENTICATED");
  });
});

describe("presence", () => {
  it("announces people coming online and going offline once all their tabs are closed", async () => {
    const ana = await createUser();
    const luka = await createUser();
    const anaSocket = await online(ana);

    const cameOnline = once(anaSocket, "presence:update");
    const lukaTab1 = await online(luka);
    expect(await cameOnline).toEqual({ userId: String(luka._id), online: true });

    // A second tab is not a new arrival, and closing one of two tabs is not leaving.
    const lukaTab2 = await online(luka);
    const quiet = collect(anaSocket, "presence:update");
    lukaTab1.disconnect();
    expect(await quiet).toEqual([]);

    const wentOffline = once(anaSocket, "presence:update");
    lukaTab2.disconnect();
    const update = await wentOffline;
    expect(update).toMatchObject({ userId: String(luka._id), online: false });
    expect((await User.findById(luka._id)).lastSeenAt.toISOString()).toBe(update.lastSeenAt);
  });

  it("gives new connections the list of who is online and marks it in API responses", async () => {
    const ana = await createUser();
    const luka = await createUser({ fullName: "Luka" });
    await online(luka);

    const socket = client(authCookie(ana));
    const snapshot = await once(socket, "presence:snapshot");
    expect(snapshot.online).toContain(String(luka._id));

    const search = await agentFor(app, ana).get("/api/users").query({ search: "Luka" });
    expect(search.body[0].isOnline).toBe(true);
  });
});

describe("realtime delivery", () => {
  it("pushes new messages to every tab of the receiver and read receipts back to the sender", async () => {
    const ana = await createUser();
    const luka = await createUser();
    const lukaPhone = await online(luka);
    const lukaLaptop = await online(luka);
    const anaSocket = await online(ana);

    const onPhone = once(lukaPhone, "message:new");
    const onLaptop = once(lukaLaptop, "message:new");
    const { conversationId } = await chat(app, ana, luka, ["are you there?"]);

    expect((await onPhone).message.text).toBe("are you there?");
    expect((await onLaptop).conversation.unreadCount).toBe(1);

    const receipt = once(anaSocket, "conversation:read");
    await agentFor(app, luka).post(`/api/conversations/${conversationId}/read`).expect(200);
    expect(await receipt).toMatchObject({ conversationId: String(conversationId), readerId: String(luka._id) });
  });
});

describe("typing indicator", () => {
  it("is forwarded only to the other person in the conversation", async () => {
    const ana = await createUser();
    const luka = await createUser();
    const outsider = await createUser();
    const { conversationId } = await chat(app, ana, luka, ["hi"]);
    const anaSocket = await online(ana);
    const lukaSocket = await online(luka);
    const outsiderSocket = await online(outsider);

    const atLuka = once(lukaSocket, "typing");
    const atOutsider = collect(outsiderSocket, "typing");
    anaSocket.emit("typing", { conversationId: String(conversationId), isTyping: true });

    expect(await atLuka).toEqual({ conversationId: String(conversationId), userId: String(ana._id), isTyping: true });
    expect(await atOutsider).toEqual([]);
  });

  it("is ignored for conversations you are not part of and after a block", async () => {
    const ana = await createUser();
    const luka = await createUser();
    const outsider = await createUser();
    const { conversationId } = await chat(app, ana, luka, ["hi"]);
    const lukaSocket = await online(luka);
    const outsiderSocket = await online(outsider);
    const anaSocket = await online(ana);

    const intruder = collect(lukaSocket, "typing");
    outsiderSocket.emit("typing", { conversationId: String(conversationId), isTyping: true });
    outsiderSocket.emit("typing", { conversationId: "nonsense", isTyping: true });
    expect(await intruder).toEqual([]);

    // Typing once caches the peer; blocking must still cut it off.
    anaSocket.emit("typing", { conversationId: String(conversationId), isTyping: true });
    await once(lukaSocket, "typing");
    await agentFor(app, luka).post(`/api/users/${ana._id}/block`).expect(200);

    const afterBlock = collect(lukaSocket, "typing");
    anaSocket.emit("typing", { conversationId: String(conversationId), isTyping: true });
    expect(await afterBlock).toEqual([]);
  });
});
