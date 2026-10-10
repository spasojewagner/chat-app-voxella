/**
 * Demo data: seven people and a week of conversations, from the point of view of
 * ana@demo.test. Every account uses the password "password123".
 *
 *   npm run seed
 *
 * Only touches @demo.test accounts and their conversations, so it is safe on a database
 * that already has real users.
 */
import "dotenv/config";
import crypto from "node:crypto";
import zlib from "node:zlib";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { loadEnv } from "../src/config/env.js";
import { createStorage } from "../src/lib/storage.js";
import { Conversation } from "../src/models/Conversation.js";
import { Message } from "../src/models/Message.js";
import { User } from "../src/models/User.js";

const PASSWORD = "password123";
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const people = {
  ana: { fullName: "Ana Petrović", status: "Product designer · Belgrade" },
  luka: { fullName: "Luka Jovanović", status: "Shipping the mobile release 🚀" },
  mia: { fullName: "Mia Novak", status: "Out hiking until Monday" },
  daniel: { fullName: "Daniel Weber", status: "Frontend @ Northwind" },
  sofia: { fullName: "Sofia Rossi", status: "Coffee first ☕" },
  jonas: { fullName: "Jonas Berg", status: "" },
  elena: { fullName: "Elena Popescu", status: "Recruiting · always happy to chat" },
};

// [from, text, minutes ago, { image?, unread? }]
const threads = {
  luka: [
    ["luka", "Morning! Did you see the crash report from last night?", 190],
    ["ana", "Just now. Looks like the image cache again", 186],
    ["luka", "Yep. I pushed a fix, waiting for CI", 185],
    ["ana", "Nice, ping me when it's green and I'll test on my phone", 183],
    ["luka", "Green ✅", 40],
    ["luka", "Here's the new onboarding screen we talked about", 6, { image: [124, 58, 237], unread: true }],
    ["luka", "Thoughts before I send it to the team?", 5, { unread: true }],
  ],
  daniel: [
    ["daniel", "Can we move the design review to 3pm?", 300],
    ["ana", "Works for me", 296],
    ["daniel", "Great. I'll share the Figma link in the invite", 295],
    ["ana", "Perfect, see you then 👋", 120],
  ],
  mia: [
    ["mia", "Are you joining us on Saturday?", DAY / MINUTE + 200],
    ["ana", "Which trail are you doing?", DAY / MINUTE + 190],
    ["mia", "Avala, the long loop. Leaving at 8", DAY / MINUTE + 185],
    ["ana", "I'm in! I'll bring snacks", DAY / MINUTE + 160],
    ["mia", "You're the best 😄", DAY / MINUTE + 158],
  ],
  sofia: [
    ["ana", "Thanks for the intro to your team yesterday!", 2 * DAY / MINUTE + 100],
    ["sofia", "Of course! They loved the prototype", 2 * DAY / MINUTE + 60],
    ["sofia", "Coffee next week to talk about the next sprint?", 2 * DAY / MINUTE + 59, { unread: true }],
  ],
  elena: [
    ["elena", "Hi Ana, I came across your portfolio. Do you have a minute this week?", 3 * DAY / MINUTE],
    ["ana", "Hi Elena! Sure, Thursday afternoon works best for me", 3 * DAY / MINUTE - 30],
    ["ana", "Here's my latest case study as well", 3 * DAY / MINUTE - 29, { image: [14, 165, 233] }],
  ],
  jonas: [
    ["jonas", "Sent you the invoice for the illustrations", 6 * DAY / MINUTE],
    ["ana", "Got it, paying today. Thanks Jonas!", 6 * DAY / MINUTE - 45],
  ],
};

const env = loadEnv();
const storage = createStorage(env);
await mongoose.connect(env.MONGO_URI);

// Start from a clean slate for the demo accounts only.
const old = await User.find({ email: /@demo\.test$/ }).select("_id");
const oldIds = old.map((u) => u._id);
const oldConversations = await Conversation.find({ participants: { $in: oldIds } }).select("_id");
await Message.deleteMany({ conversationId: { $in: oldConversations.map((c) => c._id) } });
await Conversation.deleteMany({ _id: { $in: oldConversations.map((c) => c._id) } });
await User.deleteMany({ _id: { $in: oldIds } });

const hash = await bcrypt.hash(PASSWORD, 10);
const users = {};
for (const [handle, data] of Object.entries(people)) {
  users[handle] = await User.create({
    ...data,
    email: `${handle}@demo.test`,
    password: hash,
    lastSeenAt: new Date(Date.now() - (handle === "jonas" ? 2 * DAY : 25 * MINUTE)),
  });
}

const now = Date.now();
for (const [handle, lines] of Object.entries(threads)) {
  const me = users.ana;
  const other = users[handle];
  const conversation = await Conversation.create({
    key: Conversation.keyFor(me._id, other._id),
    participants: [me._id, other._id],
  });

  const docs = [];
  for (const [from, text, minutesAgo, options = {}] of lines) {
    const sender = users[from];
    const receiver = sender === me ? other : me;
    const createdAt = new Date(now - minutesAgo * MINUTE);
    const image = options.image ? (await storage.saveImage(gradientPng(options.image), "messages")).url : undefined;
    // Ana's last message to Elena hasn't been seen yet; everything else older than the unread ones has.
    const read = !options.unread && !(handle === "elena" && from === "ana");
    docs.push({
      _id: objectIdAt(createdAt),
      conversationId: conversation._id,
      senderId: sender._id,
      receiverId: receiver._id,
      text,
      image,
      readAt: read ? new Date(createdAt.getTime() + 2 * MINUTE) : null,
      createdAt,
      updatedAt: createdAt,
    });
  }
  await Message.collection.insertMany(docs);

  const last = docs.at(-1);
  const unreadFor = (user) => docs.filter((d) => d.receiverId.equals(user._id) && !d.readAt).length;
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: {
          _id: last._id,
          senderId: last.senderId,
          text: last.text ?? "",
          hasImage: Boolean(last.image),
          createdAt: last.createdAt,
        },
        lastMessageAt: last.createdAt,
        unread: { [String(me._id)]: unreadFor(me), [String(other._id)]: unreadFor(other) },
      },
    },
  );
}

console.log(`Seeded ${Object.keys(users).length} users and ${Object.keys(threads).length} conversations.`);
console.log(`Sign in as ana@demo.test (or any other @demo.test user) with "${PASSWORD}".`);
await mongoose.disconnect();

/** ObjectIds sort by their first 4 bytes, so history pages in the same order as createdAt. */
function objectIdAt(date) {
  const seconds = Math.floor(date.getTime() / 1000).toString(16).padStart(8, "0");
  return new mongoose.Types.ObjectId(seconds + crypto.randomBytes(8).toString("hex"));
}

/** A small diagonal gradient PNG standing in for a shared photo. */
function gradientPng([r, g, b], width = 640, height = 420) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    for (let x = 0; x < width; x++) {
      const t = (x / width + y / height) / 2;
      row[1 + x * 3] = Math.round(r + (255 - r) * t * 0.55);
      row[2 + x * 3] = Math.round(g + (255 - g) * t * 0.55);
      row[3 + x * 3] = Math.round(b + (255 - b) * t * 0.35);
    }
    rows.push(row);
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour RGB
  const buffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return { buffer, mimetype: "image/png", originalname: "photo.png" };
}

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
