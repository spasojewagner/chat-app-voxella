import { forbidden, HttpError } from "../lib/http-error.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";

export async function listMessages(conversation, { before, limit }) {
  const filter = { conversationId: conversation._id };
  if (before) filter._id = { $lt: before };

  const page = await Message.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
  const hasMore = page.length > limit;
  return { messages: page.slice(0, limit).reverse(), hasMore };
}

export async function sendMessage({ conversation, sender, text, file, storage }) {
  const receiverId = conversation.otherParticipantId(sender._id);
  const receiver = await User.findById(receiverId).select("fullName blockedUsers");

  if (sender.hasBlocked(receiverId)) {
    throw forbidden(`You blocked ${receiver?.fullName ?? "this person"}. Unblock them to send messages.`, "BLOCKED_BY_YOU");
  }
  if (!receiver || receiver.hasBlocked(sender._id)) {
    throw forbidden("You can't send messages to this person.", "BLOCKED");
  }
  if (!text && !file) throw new HttpError(422, "Write a message or attach an image.", "VALIDATION_ERROR");

  const image = file ? (await storage.saveImage(file, "messages")).url : undefined;
  const message = await Message.create({
    conversationId: conversation._id,
    senderId: sender._id,
    receiverId,
    text: text || undefined,
    image,
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: {
          _id: message._id,
          senderId: sender._id,
          text: message.text ?? "",
          hasImage: Boolean(image),
          createdAt: message.createdAt,
        },
        lastMessageAt: message.createdAt,
      },
      $inc: { [`unread.${receiverId}`]: 1 },
    },
  );

  return { message: message.toJSON(), receiverId };
}

/** Marks everything the reader has received in the conversation as read. */
export async function markConversationRead(conversation, readerId) {
  const readAt = new Date();
  const result = await Message.updateMany(
    { conversationId: conversation._id, receiverId: readerId, readAt: null },
    { $set: { readAt } },
  );
  await Conversation.updateOne({ _id: conversation._id }, { $set: { [`unread.${readerId}`]: 0 } });
  return { updated: result.modifiedCount, readAt };
}

export async function listSharedImages(conversation, limit = 30) {
  return Message.find({ conversationId: conversation._id, image: { $exists: true, $ne: null } })
    .sort({ _id: -1 })
    .limit(limit)
    .select("image senderId createdAt")
    .lean();
}
