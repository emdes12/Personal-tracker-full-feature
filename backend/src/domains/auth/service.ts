import { db } from "../../db/index";
import type { UserRow } from "../../db/types";
import { ConflictError, UnauthorizedError } from "../../lib/errors";
import { isValidTimezone } from "../../lib/time";
import { seedDefaultAreas } from "../areas/service";
import { hashPassword, verifyPassword } from "./password";

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
  sleepGoalMinutes: number;
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    timezone: row.timezone,
    sleepGoalMinutes: row.sleepGoalMinutes,
  };
}

export async function signup(input: { email: string; password: string; name?: string; timezone?: string }) {
  const email = input.email.trim().toLowerCase();
  const timezone = input.timezone && isValidTimezone(input.timezone) ? input.timezone : "UTC";

  const existing = await db<UserRow>("users").where({ email }).first();
  if (existing) throw new ConflictError("An account with this email already exists");

  const passwordHash = await hashPassword(input.password);

  const user = await db.transaction(async (trx) => {
    const [row] = await trx<UserRow>("users")
      .insert({ email, passwordHash, name: input.name ?? null, timezone })
      .returning("*");
    await seedDefaultAreas(row.id, trx);
    return row;
  });

  return toPublicUser(user);
}

export async function login(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const user = await db<UserRow>("users").where({ email }).first();
  if (!user) throw new UnauthorizedError("Invalid email or password");

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Invalid email or password");

  return toPublicUser(user);
}

export async function getUserById(userId: string) {
  const user = await db<UserRow>("users").where({ id: userId }).first();
  return user ? toPublicUser(user) : null;
}
