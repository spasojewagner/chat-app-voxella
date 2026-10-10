import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { clearAuthCookie, setAuthCookie } from "../lib/auth-token.js";
import { conflict, HttpError } from "../lib/http-error.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { User } from "../models/User.js";

export const BCRYPT_ROUNDS = 10;
// Compared against when the email is unknown, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("voxella-timing-guard", BCRYPT_ROUNDS);

export const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);
export const fullName = z
  .string()
  .trim()
  .min(2, "Your name needs at least 2 characters.")
  .max(50, "Your name can be up to 50 characters.");
export const newPassword = z
  .string()
  .min(8, "Use at least 8 characters for your password.")
  .max(72, "Passwords can be up to 72 characters.");

const registerSchema = z.object({ fullName, email, password: newPassword });
const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password.").max(200) });

export function authRoutes({ env, rateLimits }) {
  const router = Router();
  const limiter = authLimiter(rateLimits.auth);

  router.post("/register", limiter, validate({ body: registerSchema }), async (req, res) => {
    const { fullName, email, password } = req.valid.body;
    if (await User.exists({ email })) throw conflict("An account with this email already exists.", "EMAIL_TAKEN");

    const user = await User.create({ fullName, email, password: await bcrypt.hash(password, BCRYPT_ROUNDS) });
    setAuthCookie(res, user._id, env);
    res.status(201).json(user);
  });

  router.post("/login", limiter, validate({ body: loginSchema }), async (req, res) => {
    const { email, password } = req.valid.body;
    const user = await User.findOne({ email }).select("+password");
    const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
    if (!user || !valid) throw new HttpError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");

    setAuthCookie(res, user._id, env);
    res.json(user);
  });

  router.post("/logout", (_req, res) => {
    clearAuthCookie(res, env);
    res.status(204).end();
  });

  router.get("/me", requireAuth(env), (req, res) => {
    res.json(req.user);
  });

  return router;
}
