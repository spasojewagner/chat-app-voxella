import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),
  // Comma-separated list of origins allowed to call the API from another domain.
  // Not needed when the API serves the built frontend or when Vite proxies /api in development.
  CORS_ORIGIN: z.string().optional().default(""),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  UPLOAD_DIR: z.string().default("uploads"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
});

export function loadEnv(source = process.env) {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  const env = parsed.data;

  return {
    ...env,
    isProduction: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
    corsOrigins: env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean),
    cloudinaryEnabled: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET),
    logLevel: env.LOG_LEVEL ?? (env.NODE_ENV === "test" ? "silent" : "info"),
  };
}
