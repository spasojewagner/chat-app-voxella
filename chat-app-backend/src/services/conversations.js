import { badRequest, notFound } from "../lib/http-error.js";
import { Conversation } from "../models/Conversation.js";
import { User } from "../models/User.js";

// Participants are loaded with their block lists so both sides of a block can be shown;
// the lists themselves never leave the server.
const PARTICIPANT_FIELDS = "fullName profilePic status lastSeenAt blockedUsers";

export function populateParticipants(query) {
  return query.populate({ path: "participants", select: PARTICIPANT_FIELDS });
}

/** The conversation as one participant sees it. Expects populated participants. */
export function serializeConversation(conversation, viewerId, presence) {
  const viewer = conversation.participants.find((p) => p._id.equals(viewerId));
  const other = conversation.participants.find((p) => !p._id.equals(viewerId));
  const last = conversation.lastMessage?._id ? conversation.lastMessage : null;

  return {
    _id: conversation._id,
    participant: other
      ? { ...other.toPublicJSON(), isOnline: presence?.isOnline(other._id) ?? false }
      : null,
    lastMessage: last
      ? {
          _id: last._id,
          senderId: last.senderId,
          text: last.text ?? "",
          hasImage: Boolean(last.hasImage),
          createdAt: last.createdAt,
          // For the sender's own last message: has the other person read it yet?
          seen: other ? (conversation.unread?.get(String(other._id)) ?? 0) === 0 : false,
        }
      : null,
    unreadCount: conversation.unread?.get(String(viewerId)) ?? 0,
    lastMessageAt: conversation.lastMessageAt,
    blockedByMe: Boolean(viewer && other && viewer.hasBlocked(other._id)),
    blockedMe: Boolean(viewer && other && other.hasBlocked(viewer._id)),
  };
}

export async function listConversations(userId) {
  return populateParticipants(
    Conversation.find({ participants: userId, "lastMessage._id": { $exists: true } }).sort({ lastMessageAt: -1 }).limit(200),
  );
}

/** Loads a conversation the user takes part in. Anyone else gets a 404, not a 403, so ids can't be probed. */
export async function findConversationFor(conversationId, userId) {
  const conversation = await populateParticipants(Conversation.findOne({ _id: conversationId, participants: userId }));
  if (!conversation) throw notFound("Conversation not found.");
  return conversation;
}

export async function getOrCreateConversation(user, otherUserId) {
  if (user._id.equals(otherUserId)) throw badRequest("You can't start a conversation with yourself.");

  const other = await User.findById(otherUserId).select("blockedUsers");
  if (!other || other.hasBlocked(user._id)) throw notFound("User not found.");

  const key = Conversation.keyFor(user._id, other._id);
  try {
    await Conversation.updateOne(
      { key },
      { $setOnInsert: { key, participants: [user._id, other._id], lastMessageAt: new Date() } },
      { upsert: true },
    );
  } catch (error) {
    // Two tabs opening the same chat at once: the second upsert loses the race, the row exists.
    if (error?.code !== 11000) throw error;
  }
  return populateParticipants(Conversation.findOne({ key }));
}

/** Ids of everyone the user has a conversation with, for broadcasting profile changes. */
export async function contactIdsOf(userId) {
  const conversations = await Conversation.find({ participants: userId }).select("participants").lean();
  const ids = new Set();
  for (const c of conversations) {
    for (const p of c.participants) if (!p.equals(userId)) ids.add(String(p));
  }
  return [...ids];
}
