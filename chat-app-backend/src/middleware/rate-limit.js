import { rateLimit } from "express-rate-limit";

function limiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ message, code: "TOO_MANY_REQUESTS" }),
  });
}

export function authLimiter(limit = 20) {
  return limiter({
    windowMs: 15 * 60 * 1000,
    limit,
    message: "Too many attempts. Please wait a few minutes and try again.",
  });
}

export function apiLimiter(limit = 600) {
  return limiter({ windowMs: 60 * 1000, limit, message: "Slow down a little and try again in a minute." });
}
