import type { Knex } from "knex";
import { db } from "../../db/index";
import type { AreaRow } from "../../db/types";
import { NotFoundError } from "../../lib/errors";
import { DEFAULT_AREA_NAMES } from "./defaults";

export async function seedDefaultAreas(userId: string, trx: Knex = db) {
  await trx("areas").insert(DEFAULT_AREA_NAMES.map((name) => ({ userId, name, isDefault: true })));
}

export function listAreas(userId: string): Promise<AreaRow[]> {
  return db<AreaRow>("areas").where({ userId }).orderBy([{ column: "isDefault", order: "asc" }, { column: "name", order: "asc" }]);
}

export async function createArea(userId: string, input: { name: string; color?: string | null }): Promise<AreaRow> {
  const [row] = await db<AreaRow>("areas")
    .insert({ userId, name: input.name, color: input.color ?? null })
    .returning("*");
  return row;
}

export async function updateArea(
  userId: string,
  areaId: string,
  input: { name?: string; color?: string | null },
): Promise<AreaRow> {
  const [row] = await db<AreaRow>("areas").where({ id: areaId, userId }).update(input).returning("*");
  if (!row) throw new NotFoundError("Area not found");
  return row;
}

export async function deleteArea(userId: string, areaId: string): Promise<void> {
  const count = await db<AreaRow>("areas").where({ id: areaId, userId }).del();
  if (count === 0) throw new NotFoundError("Area not found");
}
