import jwt from "jsonwebtoken";

export const COOKIE_NAME = "jwt";

export function signToken(userId, env) {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, { expiresIn: `${env.JWT_EXPIRES_IN_DAYS}d` });
}

/** Returns the user id from a token, or null when the token is missing, expired or forged. */
export function verifyToken(token, env) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    // `userId` is what tokens issued by v1 carried; keep them valid until they expire.
    return payload.sub ?? payload.userId ?? null;
  } catch {
    return null;
  }
}

export function cookieOptions(env) {
  // Same-site deployments (the API serves the app, or Vite proxies it) get the strictest cookie.
  // A frontend on another domain (CORS_ORIGIN set) can only send it as SameSite=None over HTTPS.
  const crossSite = env.corsOrigins.length > 0;
  return {
    httpOnly: true,
    sameSite: crossSite ? "none" : "strict",
    secure: env.isProduction || crossSite,
    path: "/",
  };
}

export function setAuthCookie(res, userId, env) {
  res.cookie(COOKIE_NAME, signToken(userId, env), {
    ...cookieOptions(env),
    maxAge: env.JWT_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res, env) {
  // A cookie is only removed when the options match the ones it was set with.
  res.clearCookie(COOKIE_NAME, cookieOptions(env));
}
