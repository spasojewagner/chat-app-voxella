import pino from "pino";

export function createLogger(level = "info") {
  return pino({
    level,
    redact: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'],
  });
}
