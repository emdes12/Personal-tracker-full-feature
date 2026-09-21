import type { NextFunction, Request, Response } from "express";
import { getUserById } from "../domains/auth/service";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "../domains/auth/jwt";
import { UnauthorizedError } from "../lib/errors";
import { asyncHandler } from "../lib/asyncHandler";

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined;
  const token = req.cookies?.[AUTH_COOKIE_NAME] ?? bearer;
  if (!token) throw new UnauthorizedError("Not authenticated");

  let payload;
  try {
    payload = verifyAuthToken(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired session");
  }

  const user = await getUserById(payload.sub);
  if (!user) throw new UnauthorizedError("Invalid or expired session");

  req.user = { id: user.id, email: user.email, timezone: user.timezone };
  next();
});
