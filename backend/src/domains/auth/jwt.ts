import jwt from "jsonwebtoken";

const JWT_SECRET: string = (() => {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set");
  return value;
})();

const EXPIRES_IN_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface AuthTokenPayload {
  sub: string; // user id
}

export function signAuthToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies AuthTokenPayload, JWT_SECRET, {
    expiresIn: EXPIRES_IN_SECONDS,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
}

export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE_MS = EXPIRES_IN_SECONDS * 1000;
