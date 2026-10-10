import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api.js";
import { useChat } from "./chat.js";

const ME = "me";
const conversation = (id, overrides = {}) => ({
  _id: id,
  participant: { _id: `peer-${id}`, fullName: `Peer ${id}`, lastSeenAt: null },
  lastMessage: null,
  unreadCount: 0,
  lastMessageAt: "2026-10-10T10:00:00.000Z",
  blockedByMe: false,
  blockedMe: false,
  ...overrides,
});
const message = (id, overrides = {}) => ({
  _id: id,
  conversationId: "c1",
  senderId: "peer-c1",
  receiverId: ME,
  text: id,
  createdAt: "2026-10-10T10:05:00.000Z",
  readAt: null,
  ...overrides,
});

function withThread(messages) {
  useChat.setState((s) => ({
    threads: { ...s.threads, c1: { messages, hasMore: false, loading: false, loaded: true, error: null } },
  }));
}

beforeEach(() => {
  vi.restoreAllMocks();
  useChat.getState().reset();
  useChat.setState({ me: ME, conversations: { c1: conversation("c1") } });
});

describe("incoming messages", () => {
  it("append to an open thread and update the conversation from the payload", () => {
    withThread([message("m1")]);

    useChat.getState().receiveMessage({ message: message("m2"), conversation: conversation("c1", { unreadCount: 3 }) });

    const state = useChat.getState();
    expect(state.threads.c1.messages.map((m) => m._id)).toEqual(["m1", "m2"]);
    expect(state.conversations.c1.unreadCount).toBe(3);
  });

  it("are not added twice when the same message arrives over HTTP and the socket", () => {
    withThread([]);
    const payload = { message: message("m1"), conversation: conversation("c1") };

    useChat.getState().receiveMessage(payload);
    useChat.getState().receiveMessage(payload);

    expect(useChat.getState().threads.c1.messages).toHaveLength(1);
  });

  it("end the other person's typing indicator", () => {
    withThread([]);
    useChat.getState().receiveTyping({ conversationId: "c1", isTyping: true });
    expect(useChat.getState().typing.c1).toBe(true);

    useChat.getState().receiveMessage({ message: message("m1") });

    expect(useChat.getState().typing.c1).toBeUndefined();
  });
});

describe("sending", () => {
  it("shows the message at once and swaps in the saved one, keeping the client id", async () => {
    withThread([]);
    let resolve;
    vi.spyOn(api, "post").mockReturnValue(new Promise((r) => (resolve = r)));

    const sending = useChat.getState().send("c1", { text: "  hello  " });

    const [optimistic] = useChat.getState().threads.c1.messages;
    expect(optimistic).toMatchObject({ text: "hello", pending: true, senderId: ME });
    expect(useChat.getState().conversations.c1.lastMessage.text).toBe("hello");

    const saved = message("server-id", { senderId: ME, receiverId: "peer-c1", text: "hello", clientId: optimistic.clientId });
    resolve({ data: { message: saved, conversation: conversation("c1") } });
    await sending;

    const messages = useChat.getState().threads.c1.messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ _id: "server-id", clientId: optimistic.clientId });
    expect(messages[0].pending).toBeUndefined();
  });

  it("marks the message as failed with the server's reason and can retry it", async () => {
    withThread([]);
    const post = vi.spyOn(api, "post").mockRejectedValueOnce({
      response: { status: 403, data: { code: "BLOCKED", message: "You can't send messages to this person." } },
    });

    await useChat.getState().send("c1", { text: "hi" });

    const [failed] = useChat.getState().threads.c1.messages;
    expect(failed).toMatchObject({ failed: true, error: "You can't send messages to this person." });
    expect(useChat.getState().conversations.c1.blockedMe).toBe(true);

    post.mockResolvedValueOnce({
      data: { message: message("ok", { senderId: ME, text: "hi", clientId: "x" }), conversation: conversation("c1") },
    });
    await useChat.getState().retry("c1", failed.clientId);
    expect(post).toHaveBeenLastCalledWith("/conversations/c1/messages", expect.objectContaining({ text: "hi" }));
  });
});

describe("read receipts", () => {
  it("mark my messages up to the read time as seen when the other person reads them", () => {
    withThread([
      message("mine-old", { senderId: ME, receiverId: "peer-c1", createdAt: "2026-10-10T10:00:00.000Z" }),
      message("theirs", { createdAt: "2026-10-10T10:01:00.000Z" }),
      message("mine-new", { senderId: ME, receiverId: "peer-c1", createdAt: "2026-10-10T10:10:00.000Z" }),
    ]);

    useChat.getState().receiveRead({ conversationId: "c1", readerId: "peer-c1", readAt: "2026-10-10T10:05:00.000Z" });

    const read = Object.fromEntries(useChat.getState().threads.c1.messages.map((m) => [m._id, Boolean(m.readAt)]));
    expect(read).toEqual({ "mine-old": true, theirs: false, "mine-new": false });
  });

  it("clear the unread badge when I read the conversation in another tab", () => {
    useChat.setState({ conversations: { c1: conversation("c1", { unreadCount: 4 }) } });

    useChat.getState().receiveRead({ conversationId: "c1", readerId: ME, readAt: new Date().toISOString() });

    expect(useChat.getState().conversations.c1.unreadCount).toBe(0);
  });
});

describe("presence and typing", () => {
  it("tracks who is online and remembers when someone was last seen", () => {
    useChat.getState().setPresenceSnapshot(["peer-c1"]);
    expect(useChat.getState().online).toEqual({ "peer-c1": true });

    useChat.getState().setPresence({ userId: "peer-c1", online: false, lastSeenAt: "2026-10-10T12:00:00.000Z" });

    expect(useChat.getState().online).toEqual({});
    expect(useChat.getState().conversations.c1.participant.lastSeenAt).toBe("2026-10-10T12:00:00.000Z");
  });

  it("drops a typing indicator that is never switched off", () => {
    vi.useFakeTimers();
    useChat.getState().receiveTyping({ conversationId: "c1", isTyping: true });
    vi.advanceTimersByTime(6_100);
    expect(useChat.getState().typing.c1).toBeUndefined();
    vi.useRealTimers();
  });
});
