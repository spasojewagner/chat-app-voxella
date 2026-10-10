import { parse as parseCookies } from "cookie";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { COOKIE_NAME, verifyToken } from "../lib/auth-token.js";
import { Conversation } from "../models/Conversation.js";
import { User } from "../models/User.js";

const userRoom = (userId) => `user:${userId}`;

/**
 * Socket.IO layer. The rest of the app only sees `emitToUser` and `isOnline`, so routes can
 * be tested without a socket server and the transport could change without touching them.
 *
 * Server → client events:
 *   presence:snapshot  { online: string[] }                       right after connecting
 *   presence:update    { userId, online, lastSeenAt? }            someone came online / went offline
 *   message:new        { message, conversation }                  to the receiver and the sender's other tabs
 *   conversation:read  { conversationId, readerId, readAt }       read receipts
 *   typing             { conversationId, userId, isTyping }
 *   block:updated      { userId, blockedByMe?, blockedMe? }
 *   user:updated       { user }                                   a contact changed name, photo or status
 *
 * Client → server events:
 *   typing             { conversationId, isTyping }
 */
export function createRealtime({ env, logger }) {
  let io = null;
  /** userId -> ids of that user's open sockets (one per tab or device). */
  const connections = new Map();

  async function authenticate(socket, next) {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie ?? "");
      const userId = verifyToken(cookies[COOKIE_NAME], env);
      if (!userId || !mongoose.isValidObjectId(userId) || !(await User.exists({ _id: userId }))) {
        return next(new Error("UNAUTHENTICATED"));
      }
      socket.data.userId = String(userId);
      socket.data.peers = new Map(); // conversationId -> other participant id, filled on first use
      next();
    } catch (error) {
      next(error);
    }
  }

  async function peerFor(socket, conversationId) {
    if (socket.data.peers.has(conversationId)) return socket.data.peers.get(conversationId);
    if (!mongoose.isValidObjectId(conversationId)) return null;

    const conversation = await Conversation.findOne({ _id: conversationId, participants: socket.data.userId }).select(
      "participants",
    );
    let peer = conversation?.otherParticipantId(socket.data.userId) ?? null;
    if (peer) {
      const me = socket.data.userId;
      const blocked = await User.exists({ $or: [{ _id: me, blockedUsers: peer }, { _id: peer, blockedUsers: me }] });
      if (blocked) peer = null;
    }
    socket.data.peers.set(conversationId, peer);
    return peer;
  }

  function onConnection(socket) {
    const { userId } = socket.data;
    socket.join(userRoom(userId));

    const sockets = connections.get(userId) ?? new Set();
    const cameOnline = sockets.size === 0;
    sockets.add(socket.id);
    connections.set(userId, sockets);

    socket.emit("presence:snapshot", { online: [...connections.keys()] });
    if (cameOnline) socket.broadcast.emit("presence:update", { userId, online: true });

    socket.on("typing", async (payload) => {
      try {
        const conversationId = String(payload?.conversationId ?? "");
        const peer = await peerFor(socket, conversationId);
        if (!peer) return;
        io.to(userRoom(peer)).emit("typing", { conversationId, userId, isTyping: Boolean(payload?.isTyping) });
      } catch (error) {
        logger.warn({ err: error }, "typing event failed");
      }
    });

    socket.on("disconnect", async () => {
      const open = connections.get(userId);
      open?.delete(socket.id);
      if (open && open.size > 0) return; // still connected in another tab

      connections.delete(userId);
      const lastSeenAt = new Date();
      try {
        await User.updateOne({ _id: userId }, { $set: { lastSeenAt } });
      } catch (error) {
        logger.warn({ err: error }, "could not store lastSeenAt");
      }
      // A reconnect may have happened while the write was in flight.
      if (!connections.has(userId)) io?.emit("presence:update", { userId, online: false, lastSeenAt });
    });
  }

  return {
    attach(httpServer) {
      io = new Server(httpServer, {
        cors: env.corsOrigins.length ? { origin: env.corsOrigins, credentials: true } : undefined,
        serveClient: false,
      });
      io.use(authenticate);
      io.on("connection", onConnection);
      return io;
    },

    emitToUser(userId, event, payload) {
      io?.to(userRoom(String(userId))).emit(event, payload);
    },

    isOnline(userId) {
      return connections.has(String(userId));
    },

    /** Drops cached conversation peers so the next typing event re-checks access (after a block change). */
    forgetPeers(userId) {
      if (!io) return;
      for (const socketId of connections.get(String(userId)) ?? []) {
        io.sockets.sockets.get(socketId)?.data.peers.clear();
      }
    },

    async close() {
      await io?.close();
      io = null;
      connections.clear();
    },
  };
}

/** Stand-in used when the app runs without a socket server (unit tests, scripts). */
export function createNullRealtime() {
  const sent = [];
  return {
    sent,
    attach() {},
    emitToUser(userId, event, payload) {
      // Round-trip through JSON like the real transport, so ids arrive as strings.
      sent.push({ userId: String(userId), event, payload: JSON.parse(JSON.stringify(payload)) });
    },
    isOnline: () => false,
    forgetPeers() {},
    async close() {},
  };
}
