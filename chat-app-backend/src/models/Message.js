import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: ObjectId, ref: "Conversation", required: true },
    senderId: { type: ObjectId, ref: "User", required: true },
    receiverId: { type: ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, maxlength: 4000 },
    image: { type: String },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// History is paged newest-first by _id inside a conversation.
messageSchema.index({ conversationId: 1, _id: -1 });
// Marking a conversation as read touches only the reader's unread messages.
messageSchema.index({ conversationId: 1, receiverId: 1, readAt: 1 });

export const Message = mongoose.models.Message ?? mongoose.model("Message", messageSchema);
