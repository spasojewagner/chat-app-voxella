import multer from "multer";
import { HttpError } from "../lib/http-error.js";
import { ALLOWED_IMAGE_TYPES } from "../lib/storage.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Accepts one optional image in `field`, kept in memory and handed to the storage adapter. */
export function imageUpload(field) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
      else cb(new HttpError(415, "Only JPG, PNG, WebP and GIF images are supported."));
    },
  }).single(field);

  return function handleUpload(req, res, next) {
    upload(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") return next(new HttpError(413, "Images can be up to 5 MB."));
        return next(new HttpError(400, error.message, "UPLOAD_ERROR"));
      }
      next(error);
    });
  };
}
