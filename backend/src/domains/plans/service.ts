import { db } from "../../db/index";
import type { PlanRow, PlanType } from "../../db/types";
import { NotFoundError } from "../../lib/errors";

export function listPlans(userId: string): Promise<PlanRow[]> {
  return db<PlanRow>("plans").where({ userId }).orderBy("createdAt", "desc");
}

export async function getPlan(userId: string, planId: string): Promise<PlanRow> {
  const plan = await db<PlanRow>("plans").where({ id: planId, userId }).first();
  if (!plan) throw new NotFoundError("Plan not found");
  return plan;
}

export async function createPlan(
  userId: string,
  input: {
    name: string;
    description?: string | null;
    type?: PlanType;
    startDate?: string | null;
    endDate?: string | null;
  },
): Promise<PlanRow> {
  const [row] = await db<PlanRow>("plans").insert({ userId, ...input }).returning("*");
  return row;
}

export async function updatePlan(userId: string, planId: string, input: Partial<PlanRow>): Promise<PlanRow> {
  const [row] = await db<PlanRow>("plans")
    .where({ id: planId, userId })
    .update({ ...input, updatedAt: new Date() })
    .returning("*");
  if (!row) throw new NotFoundError("Plan not found");
  return row;
}

export async function deletePlan(userId: string, planId: string): Promise<void> {
  const count = await db<PlanRow>("plans").where({ id: planId, userId }).del();
  if (count === 0) throw new NotFoundError("Plan not found");
}
