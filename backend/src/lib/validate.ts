import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, z } from "zod";

/** Parses req.body with the given schema, replacing it with the parsed value, or throws a ZodError (caught by errorHandler). */
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body) as z.infer<T>;
    next();
  };
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { validatedQuery: z.infer<T> }).validatedQuery = schema.parse(req.query);
    next();
  };
}
