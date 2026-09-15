import { db } from "../../db/index";
import type { GoalRow, TargetRow, TargetType } from "../../db/types";
import { NotFoundError } from "../../lib/errors";
import { computeTargetProgress } from "../progress/service";

async function assertGoalOwnership(userId: string, goalId: string) {
  const goal = await db<GoalRow>("goals").where({ id: goalId, userId }).first();
  if (!goal) throw new NotFoundError("Goal not found");
}

export interface TargetWithProgress {
  id: string;
  goalId: string;
  parentTargetId: string | null;
  type: string;
  title: string;
  description: string | null;
  status: string;
  orderIndex: number;
  startDate: string | null;
  dueDate: string | null;
  progress: { completed: number; total: number; percent: number };
  children: TargetWithProgress[];
}

export async function listTargetsForGoal(userId: string, goalId: string): Promise<TargetWithProgress[]> {
  await assertGoalOwnership(userId, goalId);

  const rows = await db<TargetRow>("targets").where({ goalId }).orderBy([{ column: "orderIndex", order: "asc" }, { column: "createdAt", order: "asc" }]);

  const withProgress = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      progress: await computeTargetProgress(row.id),
      children: [] as TargetWithProgress[],
    })),
  );

  const byId = new Map(withProgress.map((t) => [t.id, t]));
  const roots: TargetWithProgress[] = [];
  for (const target of withProgress) {
    if (target.parentTargetId) {
      const parent = byId.get(target.parentTargetId);
      if (parent) {
        parent.children.push(target);
        continue;
      }
    }
    roots.push(target);
  }
  return roots;
}

export async function getTarget(userId: string, targetId: string) {
  const target = await db<TargetRow>("targets").where({ id: targetId, userId }).first();
  if (!target) throw new NotFoundError("Target not found");
  const progress = await computeTargetProgress(target.id);
  return { ...target, progress };
}

export async function createTarget(
  userId: string,
  input: {
    goalId: string;
    parentTargetId?: string | null;
    type?: TargetType;
    title: string;
    description?: string | null;
    orderIndex?: number;
    startDate?: string | null;
    dueDate?: string | null;
  },
): Promise<TargetRow> {
  await assertGoalOwnership(userId, input.goalId);
  if (input.parentTargetId) {
    const parent = await db<TargetRow>("targets").where({ id: input.parentTargetId, userId, goalId: input.goalId }).first();
    if (!parent) throw new NotFoundError("Parent target not found");
  }
  const [row] = await db<TargetRow>("targets").insert({ userId, ...input }).returning("*");
  return row;
}

export async function updateTarget(userId: string, targetId: string, input: Partial<TargetRow>): Promise<TargetRow> {
  const [row] = await db<TargetRow>("targets")
    .where({ id: targetId, userId })
    .update({ ...input, updatedAt: new Date() })
    .returning("*");
  if (!row) throw new NotFoundError("Target not found");
  return row;
}

export async function deleteTarget(userId: string, targetId: string): Promise<void> {
  const count = await db<TargetRow>("targets").where({ id: targetId, userId }).del();
  if (count === 0) throw new NotFoundError("Target not found");
}
