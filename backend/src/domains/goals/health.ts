import { DateTime } from "luxon";
import type { ProgressStats } from "../progress/service";

export type GoalHealth = "on_track" | "at_risk" | "behind" | "completed" | "no_deadline";

export interface GoalHealthInfo {
  health: GoalHealth;
  daysRemaining: number | null;
}

/**
 * Deadline-aware health: compares actual progress to the progress you'd
 * expect if work were spread evenly from startDate (or createdAt, if no
 * startDate was set) to deadline. Purely a read-time calculation — nothing
 * is stored, so editing a deadline or completing tasks late just changes
 * what this returns on the next read.
 */
export function computeGoalHealth(
  goal: { status: string; startDate: string | null; deadline: string | null; createdAt: Date },
  progress: ProgressStats,
): GoalHealthInfo {
  if (goal.status === "completed") return { health: "completed", daysRemaining: null };
  if (!goal.deadline) return { health: "no_deadline", daysRemaining: null };

  const today = DateTime.now().startOf("day");
  const deadline = DateTime.fromISO(goal.deadline).startOf("day");
  const start = goal.startDate ? DateTime.fromISO(goal.startDate).startOf("day") : DateTime.fromJSDate(goal.createdAt).startOf("day");

  const daysRemaining = Math.ceil(deadline.diff(today, "days").days);

  const totalSpan = Math.max(deadline.diff(start, "days").days, 1);
  const elapsed = Math.min(Math.max(today.diff(start, "days").days, 0), totalSpan);
  const expectedPercent = (elapsed / totalSpan) * 100;

  const gap = expectedPercent - progress.percent;

  if (today > deadline && progress.percent < 100) return { health: "behind", daysRemaining };
  if (gap >= 20) return { health: "behind", daysRemaining };
  if (gap >= 8) return { health: "at_risk", daysRemaining };
  return { health: "on_track", daysRemaining };
}
