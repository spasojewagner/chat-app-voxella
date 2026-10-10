import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import { objectId, validate } from "../middleware/validate.js";
import {
  findConversationFor,
  getOrCreateConversation,
  listConversations,
  populateParticipants,
  serializeConversation,
} from "../services/conversations.js";
import { listMessages, listSharedImages, markConversationRead, sendMessage } from "../services/messages.js";
import { Conversation } from "../models/Conversation.js";

const idParams = z.object({ id: objectId });
const startSchema = z.object({ userId: objectId });
const pageSchema = z.object({
  before: objectId.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});
const messageSchema = z.object({
  text: z.string().trim().max(4000, "Messages can be up to 4000 characters.").optional().default(""),
  // Set by the client on optimistic messages so every tab can match the echo to its placeholder.
  clientId: z.string().max(64).optional(),
});

export function conversationRoutes({ env, storage, realtime }) {
  const router = Router();
  router.use(requireAuth(env));

  const view = (conversation, viewerId) => serializeConversation(conversation, viewerId, realtime);

  router.get("/", async (req, res) => {
    const conversations = await listConversations(req.user._id);
    res.json(conversations.map((c) => view(c, req.user._id)));
  });

  // Opens the conversation with a user, creating it on first contact.
  router.post("/", validate({ body: startSchema }), async (req, res) => {
    const conversation = await getOrCreateConversation(req.user, req.valid.body.userId);
    res.status(200).json(view(conversation, req.user._id));
  });

  router.get("/:id", validate({ params: idParams }), async (req, res) => {
    const conversation = await findConversationFor(req.valid.params.id, req.user._id);
    res.json(view(conversation, req.user._id));
  });

  router.get("/:id/messages", validate({ params: idParams, query: pageSchema }), async (req, res) => {
    const conversation = await findConversationFor(req.valid.params.id, req.user._id);
    res.json(await listMessages(conversation, req.valid.query));
  });

  router.post(
    "/:id/messages",
    validate({ params: idParams }),
    imageUpload("image"),
    validate({ body: messageSchema }),
    async (req, res) => {
      const conversation = await findConversationFor(req.valid.params.id, req.user._id);
      const { message: saved, receiverId } = await sendMessage({
        conversation,
        sender: req.user,
        text: req.valid.body.text,
        file: req.file,
        storage,
      });

      const message = { ...saved, clientId: req.valid.body.clientId };
      const updated = await populateParticipants(Conversation.findById(conversation._id));
      realtime.emitToUser(receiverId, "message:new", { message, conversation: view(updated, receiverId) });
      realtime.emitToUser(req.user._id, "message:new", { message, conversation: view(updated, req.user._id) });

      res.status(201).json({ message, conversation: view(updated, req.user._id) });
    },
  );

  router.post("/:id/read", validate({ params: idParams }), async (req, res) => {
    const conversation = await findConversationFor(req.valid.params.id, req.user._id);
    const { updated, readAt } = await markConversationRead(conversation, req.user._id);

    const payload = { conversationId: String(conversation._id), readerId: String(req.user._id), readAt };
    if (updated > 0) realtime.emitToUser(conversation.otherParticipantId(req.user._id), "conversation:read", payload);
    realtime.emitToUser(req.user._id, "conversation:read", payload); // clears the badge in other tabs

    res.json({ ...payload, updated });
  });

  router.get("/:id/media", validate({ params: idParams }), async (req, res) => {
    const conversation = await findConversationFor(req.valid.params.id, req.user._id);
    res.json(await listSharedImages(conversation));
  });

  return router;
}
