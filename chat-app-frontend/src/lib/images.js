export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** The same rules the API enforces, checked before uploading. Returns a message or null. */
export function validateImage(file) {
  if (!IMAGE_TYPES.includes(file.type)) return "Only JPG, PNG, WebP and GIF images can be sent.";
  if (file.size > MAX_IMAGE_BYTES) return "Images can be up to 5 MB.";
  return null;
}
