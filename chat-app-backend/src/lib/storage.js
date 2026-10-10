import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
export const ALLOWED_IMAGE_TYPES = Object.keys(EXTENSIONS);

/** Images go to Cloudinary when it is configured, otherwise to a local folder served at /uploads. */
export function createStorage(env) {
  return env.cloudinaryEnabled ? cloudinaryStorage(env) : diskStorage(env.UPLOAD_DIR);
}

export function cloudinaryStorage(env) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return {
    kind: "cloudinary",
    saveImage(file, folder) {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: `voxella/${folder}`, resource_type: "image" },
          (error, result) => (error ? reject(error) : resolve({ url: result.secure_url, width: result.width, height: result.height })),
        );
        stream.end(file.buffer);
      });
    },
  };
}

export function diskStorage(dir) {
  const root = path.resolve(dir);
  return {
    kind: "disk",
    root,
    async saveImage(file, folder) {
      const name = `${crypto.randomUUID()}.${EXTENSIONS[file.mimetype] ?? "bin"}`;
      await fs.mkdir(path.join(root, folder), { recursive: true });
      await fs.writeFile(path.join(root, folder, name), file.buffer);
      return { url: `/uploads/${folder}/${name}` };
    },
  };
}

/** Keeps files in memory; used by the tests. */
export function memoryStorage() {
  const files = new Map();
  return {
    kind: "memory",
    files,
    async saveImage(file, folder) {
      const url = `/uploads/${folder}/${crypto.randomUUID()}.${EXTENSIONS[file.mimetype] ?? "bin"}`;
      files.set(url, file);
      return { url };
    },
  };
}
