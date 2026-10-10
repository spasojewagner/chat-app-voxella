import { COOKIE_NAME, verifyToken } from "../lib/auth-token.js";
import { unauthorized } from "../lib/http-error.js";
import { User } from "../models/User.js";

export function requireAuth(env) {
  return async function authenticate(req, _res, next) {
    const userId = verifyToken(req.cookies?.[COOKIE_NAME], env);
    const user = userId ? await User.findById(userId) : null;
    if (!user) throw unauthorized();
    req.user = user;
    next();
  };
}
