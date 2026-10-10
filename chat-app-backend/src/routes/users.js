import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { badRequest, conflict, HttpError, notFound } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import { objectId, validate } from "../middleware/validate.js";
import { User } from "../models/User.js";
import { contactIdsOf } from "../services/conversations.js";
import { BCRYPT_ROUNDS, email, fullName, newPassword } from "./auth.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchSchema = z.object({
  search: z.string().trim().max(60).optional().default(""),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
const profileSchema = z
  .object({ fullName, email, status: z.string().trim().max(140, "Your status can be up to 140 characters.") })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Nothing to update.");
const passwordSchema = z.object({ currentPassword: z.string().min(1).max(200), newPassword });
const idParams = z.object({ id: objectId });

export function userRoutes({ env, storage, realtime }) {
  const router = Router();
  router.use(requireAuth(env));

  const withPresence = (user) => ({ ...user.toPublicJSON(), isOnline: realtime.isOnline(user._id) });

  async function broadcastProfile(user) {
    const payload = { user: withPresence(user) };
    for (const contactId of await contactIdsOf(user._id)) realtime.emitToUser(contactId, "user:updated", payload);
  }

  // People search for starting a new conversation. Matches names, or an exact email address.
  router.get("/", validate({ query: searchSchema }), async (req, res) => {
    const { search, limit } = req.valid.query;
    const filter = { _id: { $ne: req.user._id }, blockedUsers: { $ne: req.user._id } };
    if (search) {
      filter.$or = [{ fullName: { $regex: escapeRegex(search), $options: "i" } }, { email: search.toLowerCase() }];
    }
    const users = await User.find(filter).sort({ fullName: 1 }).limit(limit);
    res.json(users.map(withPresence));
  });

  router.patch("/me", validate({ body: profileSchema }), async (req, res) => {
    const changes = req.valid.body;
    if (changes.email && changes.email !== req.user.email && (await User.exists({ email: changes.email }))) {
      throw conflict("An account with this email already exists.", "EMAIL_TAKEN");
    }
    req.user.set(changes);
    await req.user.save();
    await broadcastProfile(req.user);
    res.json(req.user);
  });

  router.put("/me/avatar", imageUpload("avatar"), async (req, res) => {
    if (!req.file) throw badRequest("Choose an image to upload.");
    const { url } = await storage.saveImage(req.file, "avatars");
    req.user.profilePic = url;
    await req.user.save();
    await broadcastProfile(req.user);
    res.json(req.user);
  });

  router.put("/me/password", validate({ body: passwordSchema }), async (req, res) => {
    const { currentPassword, newPassword: next } = req.valid.body;
    const user = await User.findById(req.user._id).select("+password");
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new HttpError(422, "Your current password is incorrect.", "INVALID_PASSWORD");
    }
    user.password = await bcrypt.hash(next, BCRYPT_ROUNDS);
    await user.save();
    res.status(204).end();
  });

  router.get("/me/blocked", async (req, res) => {
    const users = await User.find({ _id: { $in: req.user.blockedUsers } }).sort({ fullName: 1 });
    res.json(users.map(withPresence));
  });

  router.get("/:id", validate({ params: idParams }), async (req, res) => {
    const user = await User.findById(req.valid.params.id);
    if (!user || user.hasBlocked(req.user._id)) throw notFound("User not found.");
    res.json({ ...withPresence(user), blockedByMe: req.user.hasBlocked(user._id) });
  });

  async function setBlocked(req, res, blocked) {
    const targetId = req.valid.params.id;
    if (req.user._id.equals(targetId)) throw badRequest("You can't block yourself.");
    if (!(await User.exists({ _id: targetId }))) throw notFound("User not found.");

    await User.updateOne(
      { _id: req.user._id },
      blocked ? { $addToSet: { blockedUsers: targetId } } : { $pull: { blockedUsers: targetId } },
    );

    // Only the two people involved hear about it: the other side to lock or unlock the composer,
    // the blocker's other tabs to stay in sync.
    realtime.emitToUser(targetId, "block:updated", { userId: String(req.user._id), blockedMe: blocked });
    realtime.emitToUser(req.user._id, "block:updated", { userId: String(targetId), blockedByMe: blocked });
    realtime.forgetPeers(req.user._id);
    realtime.forgetPeers(targetId);

    res.json({ userId: targetId, blockedByMe: blocked });
  }

  router.post("/:id/block", validate({ params: idParams }), (req, res) => setBlocked(req, res, true));
  router.delete("/:id/block", validate({ params: idParams }), (req, res) => setBlocked(req, res, false));

  return router;
}
