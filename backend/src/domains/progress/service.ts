import { queryRaw } from "../../db/index";

export interface ProgressStats {
  completed: number;
  total: number;
  percent: number; // 0-100, rounded to nearest integer
}

function toStats(completed: number, total: number): ProgressStats {
  return {
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

// Countable statuses for progress: 'rescheduled' rows are superseded by
// their successor occurrence (excluded so carry-over chains don't inflate
// the denominator), and 'cancelled' rows are removed from the plan
// entirely. 'skipped' stays countable — it was planned and deliberately
// not done, which is exactly what should pull progress below 100%.
const COUNTABLE_STATUSES = "('todo', 'in_progress', 'completed', 'skipped')";

/**
 * Progress for a single goal: every task_occurrence with this goal_id
 * (occurrences carry a denormalized goal_id copied from their task at
 * creation, so this is a flat indexed aggregate, not a recursive walk).
 */
export async function computeGoalProgress(goalId: string): Promise<ProgressStats> {
  const rows = await queryRaw<{ completed: string; total: string }>(
    `
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed') AS completed,
      COUNT(*) AS total
    FROM task_occurrences
    WHERE goal_id = ?
      AND status IN ${COUNTABLE_STATUSES}
  `,
    [goalId],
  );
  return toStats(Number(rows[0]?.completed ?? 0), Number(rows[0]?.total ?? 0));
}

/**
 * Progress for a target, including all of its nested descendant targets
 * (milestone -> monthly -> weekly). Needs one recursive CTE to gather
 * descendant target ids since nesting depth isn't fixed.
 */
export async function computeTargetProgress(targetId: string): Promise<ProgressStats> {
  const rows = await queryRaw<{ completed: string; total: string }>(
    `
    WITH RECURSIVE descendant_targets AS (
      SELECT id FROM targets WHERE id = ?
      UNION ALL
      SELECT t.id
      FROM targets t
      INNER JOIN descendant_targets dt ON t.parent_target_id = dt.id
    )
    SELECT
      COUNT(*) FILTER (WHERE o.status = 'completed') AS completed,
      COUNT(*) AS total
    FROM task_occurrences o
    WHERE o.target_id IN (SELECT id FROM descendant_targets)
      AND o.status IN ${COUNTABLE_STATUSES}
  `,
    [targetId],
  );
  return toStats(Number(rows[0]?.completed ?? 0), Number(rows[0]?.total ?? 0));
}

export interface GoalActivityStats {
  focusedMinutes: number;
  daysActive: number;
}

/**
 * Focused time and active-day count for a goal, shown on the goal dashboard
 * (spec example: "Focused hours: 186, Days active: 76"). Focused minutes
 * count all occurrences regardless of status — time genuinely spent stays
 * counted even if the task was later cancelled. "Active" days are those
 * with either a completion or a recorded focus session for this goal.
 */
export async function computeGoalActivityStats(goalId: string): Promise<GoalActivityStats> {
  const rows = await queryRaw<{ focusedMinutes: string; daysActive: string }>(
    `
    SELECT
      COALESCE(SUM(focused_minutes), 0) AS focused_minutes,
      COUNT(DISTINCT scheduled_date) FILTER (WHERE status = 'completed' OR focused_minutes > 0) AS days_active
    FROM task_occurrences
    WHERE goal_id = ?
  `,
    [goalId],
  );
  return { focusedMinutes: Number(rows[0]?.focusedMinutes ?? 0), daysActive: Number(rows[0]?.daysActive ?? 0) };
}

/** Progress for every direct child target of a goal, in one query (used for goal drill-down views). */
export async function computeChildTargetProgress(targetIds: string[]): Promise<Map<string, ProgressStats>> {
  const map = new Map<string, ProgressStats>();
  if (targetIds.length === 0) return map;
  await Promise.all(
    targetIds.map(async (id) => {
      map.set(id, await computeTargetProgress(id));
    }),
  );
  return map;
}
