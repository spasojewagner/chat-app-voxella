/**
 * One-off migration from the v1 data model, where messages only had senderId/receiverId.
 * Creates one conversation per pair of users, links the messages to it and fills in the
 * last message. Old messages are marked as read so nobody gets a wall of unread badges.
 * Email addresses are lower-cased, since v2 signs in case-insensitively.
 *
 *   npm run migrate
 *
 * Safe to run more than once: it only touches messages without a conversationId.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { loadEnv } from "../src/config/env.js";
import { Conversation } from "../src/models/Conversation.js";
import { Message } from "../src/models/Message.js";
import { User } from "../src/models/User.js";

const env = loadEnv();
await mongoose.connect(env.MONGO_URI);

// v2 stores emails in lower case and looks them up that way; v1 kept whatever was typed.
let lowered = 0;
for await (const user of User.collection.find({ email: /[A-Z]/ })) {
  const email = user.email.trim().toLowerCase();
  if (await User.collection.findOne({ email, _id: { $ne: user._id } })) {
    console.warn(`Skipped ${user.email}: ${email} belongs to another account.`);
    continue;
  }
  await User.collection.updateOne({ _id: user._id }, { $set: { email } });
  lowered += 1;
}
if (lowered) console.log(`Lower-cased ${lowered} email addresses.`);

const legacy = Message.collection.find({ conversationId: { $exists: false } }).sort({ _id: 1 });
const touched = new Set();
let migrated = 0;

for await (const message of legacy) {
  const key = Conversation.keyFor(message.senderId, message.receiverId);
  const conversation = await Conversation.findOneAndUpdate(
    { key },
    { $setOnInsert: { key, participants: [message.senderId, message.receiverId] } },
    { upsert: true, new: true },
  );
  await Message.collection.updateOne(
    { _id: message._id },
    { $set: { conversationId: conversation._id, readAt: message.readAt ?? message.createdAt ?? new Date() } },
  );
  touched.add(String(conversation._id));
  migrated += 1;
}

for (const id of touched) {
  const last = await Message.findOne({ conversationId: id }).sort({ _id: -1 }).lean();
  await Conversation.updateOne(
    { _id: id },
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
      },
    },
  );
}

console.log(`Linked ${migrated} messages to ${touched.size} conversations.`);
await mongoose.disconnect();
