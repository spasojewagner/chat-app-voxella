export class HttpError extends Error {
  constructor(status, message, code = undefined, details = undefined) {
    super(message);
    this.status = status;
    this.code = code ?? defaultCode(status);
    this.details = details;
  }
}

function defaultCode(status) {
  return (
    {
      400: "BAD_REQUEST",
      401: "UNAUTHENTICATED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      413: "PAYLOAD_TOO_LARGE",
      415: "UNSUPPORTED_MEDIA_TYPE",
      422: "VALIDATION_ERROR",
      429: "TOO_MANY_REQUESTS",
    }[status] ?? "ERROR"
  );
}

export const badRequest = (message, code) => new HttpError(400, message, code);
export const unauthorized = (message = "Please sign in to continue.") => new HttpError(401, message);
export const forbidden = (message, code) => new HttpError(403, message, code);
export const notFound = (message = "Not found.") => new HttpError(404, message);
export const conflict = (message, code) => new HttpError(409, message, code);
