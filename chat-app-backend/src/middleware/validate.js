import mongoose from "mongoose";
import { z } from "zod";
import { HttpError } from "../lib/http-error.js";

export const objectId = z
  .string()
  .refine((value) => mongoose.isValidObjectId(value) && /^[a-f\d]{24}$/i.test(value), "Invalid id");

/**
 * Validates and normalises request parts with zod schemas. The parsed values are on `req.valid`
 * (Express 5 makes `req.query` read-only, so nothing is written back to the request).
 */
export function validate(schemas) {
  return function validateRequest(req, _res, next) {
    const valid = {};
    const issues = [];
    for (const part of ["params", "query", "body"]) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (result.success) valid[part] = result.data;
      else issues.push(...result.error.issues.map((i) => ({ path: [part, ...i.path].join("."), message: i.message })));
    }
    if (issues.length) {
      throw new HttpError(422, issues[0].message, "VALIDATION_ERROR", issues);
    }
    req.valid = { ...req.valid, ...valid }; // several validate() calls can run on one route
    next();
  };
}
