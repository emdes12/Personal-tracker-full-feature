import { DateTime } from "luxon";
import { db } from "../../db/index";
import type { TaskOccurrenceRow } from "../../db/types";
import { todayInTimezone } from "../../lib/time";

const LOOKBACK_DAYS = 365;

async function getCompletedDates(userId: string, timezone: string, goalId?: string): Promise<Set<string>> {
  const today = todayInTimezone(timezone);
  const since = DateTime.fromISO(today).minus({ days: LOOKBACK_DAYS }).toISODate()!;

  const query = db<TaskOccurrenceRow>("task_occurrences")
    .where({ userId, status: "completed" })
    .andWhere("scheduledDate", ">=", since)
    .select("scheduledDate");
  if (goalId) query.andWhere({ goalId });

  const rows = await query;
  return new Set(rows.map((r) => r.scheduledDate));
}

/**
 * Consecutive days with at least one completed task (optionally scoped to a
 * goal). Today not yet having a completion doesn't break the streak — it
 * just isn't counted until something is completed today. A supporting,
 * not primary, metric per the product spec.
 */
export async function computeCompletionStreak(userId: string, timezone: string, goalId?: string): Promise<number> {
  const today = todayInTimezone(timezone);
  const completedDates = await getCompletedDates(userId, timezone, goalId);

  let cursor = DateTime.fromISO(today);
  if (!completedDates.has(today)) {
    cursor = cursor.minus({ days: 1 });
  }

  let streak = 0;
  while (completedDates.has(cursor.toISODate()!)) {
    streak += 1;
    cursor = cursor.minus({ days: 1 });
  }
  return streak;
}

/** The longest run of consecutive completed-something days within the lookback window — a record, not a live counter. */
export async function computeLongestStreak(userId: string, timezone: string, goalId?: string): Promise<number> {
  const completedDates = await getCompletedDates(userId, timezone, goalId);
  if (completedDates.size === 0) return 0;

  const sorted = [...completedDates].sort();
  let longest = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = DateTime.fromISO(sorted[i - 1]);
    const curr = DateTime.fromISO(sorted[i]);
    if (curr.diff(prev, "days").days === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}
