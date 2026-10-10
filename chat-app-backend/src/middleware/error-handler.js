import mongoose from "mongoose";
import { HttpError } from "../lib/http-error.js";

export function notFoundHandler(req, _res, next) {
  next(new HttpError(404, `No route for ${req.method} ${req.path}.`));
}

// Express recognises error handlers by their four parameters, so `_next` has to stay.
export function errorHandler(error, req, res, _next) {
  let err = error;

  if (err instanceof mongoose.Error.CastError) err = new HttpError(404, "Not found.");
  if (err?.code === 11000) err = new HttpError(409, "That value is already taken.", "DUPLICATE");
  if (err?.type === "entity.parse.failed") err = new HttpError(400, "The request body is not valid JSON.");
  if (err?.type === "entity.too.large") err = new HttpError(413, "The request is too large.");

  if (!(err instanceof HttpError)) {
    req.log?.error({ err }, "Unhandled error");
    err = new HttpError(500, "Something went wrong on our side.", "INTERNAL_ERROR");
  }

  res.status(err.status).json({
    message: err.message,
    code: err.code,
    ...(err.details ? { issues: err.details } : {}),
  });
}
