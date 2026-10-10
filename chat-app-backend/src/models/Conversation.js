import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

/**
 * One document per pair of users. It keeps the last message and the unread counters
 * so the chat list is a single indexed query instead of a scan over all messages.
 */
const conversationSchema = new mongoose.Schema(
  {
    // "<smaller id>:<bigger id>", unique, so two people can never end up with two threads.
    key: { type: String, required: true, unique: true },
    participants: [{ type: ObjectId, ref: "User", required: true }],
    lastMessage: {
      _id: { type: ObjectId },
      senderId: { type: ObjectId },
      text: { type: String },
      hasImage: { type: Boolean },
      createdAt: { type: Date },
    },
    // userId -> number of messages that user has not read yet.
    unread: { type: Map, of: Number, default: {} },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

conversationSchema.statics.keyFor = function keyFor(a, b) {
  return [String(a), String(b)].sort().join(":");
};

conversationSchema.methods.hasParticipant = function hasParticipant(userId) {
  return this.participants.some((p) => String(p._id ?? p) === String(userId));
};

conversationSchema.methods.otherParticipantId = function otherParticipantId(userId) {
  const other = this.participants.find((p) => String(p._id ?? p) !== String(userId));
  return other ? String(other._id ?? other) : null;
};

export const Conversation = mongoose.models.Conversation ?? mongoose.model("Conversation", conversationSchema);
