import { db } from "../../db/index";
import type { DailyReviewRow, GoalRow } from "../../db/types";
import { listOccurrencesForDate } from "../tasks/occurrences.service";
import { getSleepRecordForDate } from "../sleep/service";

const COUNTABLE = new Set(["todo", "in_progress", "completed", "skipped"]);

/**
 * Daily summary uses the same "occurrences whose scheduledDate = date" lens
 * as History (see progress/service.ts's countable-statuses rule) rather than
 * re-deriving a live carried-over view, so a past day's review stays stable
 * once written instead of shifting as today's carry-over state changes.
 */
export async function computeDailySummary(userId: string, date: string) {
  const occurrences = await listOccurrencesForDate(userId, date);

  const completed = occurrences.filter((o) => o.status === "completed");
  const incomplete = occurrences.filter((o) => o.status === "todo" || o.status === "in_progress");
  const skipped = occurrences.filter((o) => o.status === "skipped");
  const carriedIn = occurrences.filter((o) => o.rescheduledFromId !== null);
  const countable = occurrences.filter((o) => COUNTABLE.has(o.status));

  const goalIds = [...new Set(completed.map((o) => o.goalId).filter((id): id is string => Boolean(id)))];
  const goalsWorkedOn = goalIds.length ? await db<GoalRow>("goals").where({ userId }).whereIn("id", goalIds) : [];

  const focusMinutes = completed.reduce((sum, o) => sum + (o.durationMinutes ?? 0), 0);

  const sleep = await getSleepRecordForDate(userId, date);

  return {
    date,
    tasksCompleted: completed.length,
    tasksIncomplete: incomplete.length,
    tasksSkipped: skipped.length,
    tasksCarriedOver: carriedIn.length,
    completionPercent: countable.length === 0 ? 0 : Math.round((completed.length / countable.length) * 100),
    focusMinutes,
    goalsWorkedOn: goalsWorkedOn.map((g) => ({ id: g.id, title: g.title })),
    sleep: sleep ? { durationMinutes: sleep.durationMinutes, quality: sleep.quality } : null,
    occurrences,
  };
}

export async function getReview(userId: string, date: string) {
  const review = await db<DailyReviewRow>("daily_reviews").where({ userId, date }).first();
  const summary = await computeDailySummary(userId, date);
  return { review: review ?? null, summary };
}

export async function upsertReview(
  userId: string,
  date: string,
  input: { accomplished?: string | null; blockers?: string | null; focusTomorrow?: string | null },
): Promise<DailyReviewRow> {
  const existing = await db<DailyReviewRow>("daily_reviews").where({ userId, date }).first();

  if (existing) {
    const [row] = await db<DailyReviewRow>("daily_reviews")
      .where({ id: existing.id })
      .update({ ...input, updatedAt: new Date() })
      .returning("*");
    return row;
  }

  const [row] = await db<DailyReviewRow>("daily_reviews").insert({ userId, date, ...input }).returning("*");
  return row;
}
