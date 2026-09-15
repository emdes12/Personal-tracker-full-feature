import { db } from "../../db/index";
import type { GoalPriority, GoalRow } from "../../db/types";
import { NotFoundError } from "../../lib/errors";
import { computeGoalActivityStats, computeGoalProgress } from "../progress/service";
import { computeGoalHealth } from "./health";

export async function listGoals(userId: string) {
  const rows = await db<GoalRow>("goals").where({ userId }).orderBy("createdAt", "desc");
  return Promise.all(
    rows.map(async (goal) => {
      const progress = await computeGoalProgress(goal.id);
      return { ...goal, progress, ...computeGoalHealth(goal, progress) };
    }),
  );
}

export async function getGoal(userId: string, goalId: string) {
  const goal = await db<GoalRow>("goals").where({ id: goalId, userId }).first();
  if (!goal) throw new NotFoundError("Goal not found");
  const [progress, activity] = await Promise.all([computeGoalProgress(goal.id), computeGoalActivityStats(goal.id)]);
  return { ...goal, progress, activity, ...computeGoalHealth(goal, progress) };
}

export async function createGoal(
  userId: string,
  input: {
    title: string;
    description?: string | null;
    planId?: string | null;
    areaId?: string | null;
    priority?: GoalPriority;
    startDate?: string | null;
    deadline?: string | null;
  },
): Promise<GoalRow> {
  const [row] = await db<GoalRow>("goals").insert({ userId, ...input }).returning("*");
  return row;
}

export async function updateGoal(userId: string, goalId: string, input: Partial<GoalRow>): Promise<GoalRow> {
  const [row] = await db<GoalRow>("goals")
    .where({ id: goalId, userId })
    .update({ ...input, updatedAt: new Date() })
    .returning("*");
  if (!row) throw new NotFoundError("Goal not found");
  return row;
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  const count = await db<GoalRow>("goals").where({ id: goalId, userId }).del();
  if (count === 0) throw new NotFoundError("Goal not found");
}
