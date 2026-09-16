import { DateTime } from "luxon";
import { queryRaw } from "../../db/index";
import { getHistoryRange, type DayHistorySummary } from "../history/service";
import { listGoals } from "../goals/service";
import { listSleepRecordsInRange } from "../sleep/service";
import { computeCompletionStreak, computeLongestStreak } from "../streaks/service";
import { todayInTimezone } from "../../lib/time";

function aggregatePercent(days: { tasksCompleted: number; tasksTotal: number }[]) {
  const completed = days.reduce((sum, d) => sum + d.tasksCompleted, 0);
  const total = days.reduce((sum, d) => sum + d.tasksTotal, 0);
  return { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

/**
 * Dashboard-level aggregates matching the spec's example: this week/month
 * completion, per-goal progress, sleep average, and streaks. Distinct from
 * Today (the moment-to-moment focus screen) — this is the "how am I doing
 * overall" view.
 */
export async function getDashboardStats(userId: string, timezone: string) {
  const today = todayInTimezone(timezone);
  const weekStart = DateTime.fromISO(today).startOf("week").toISODate()!;
  const monthStart = DateTime.fromISO(today).startOf("month").toISODate()!;
  const sevenDaysAgo = DateTime.fromISO(today).minus({ days: 6 }).toISODate()!;

  const [weekDays, monthDays, goals, sleepRecords, currentStreak, longestStreak] = await Promise.all([
    getHistoryRange(userId, weekStart, today),
    getHistoryRange(userId, monthStart, today),
    listGoals(userId),
    listSleepRecordsInRange(userId, sevenDaysAgo, today),
    computeCompletionStreak(userId, timezone),
    computeLongestStreak(userId, timezone),
  ]);

  const sleepAvgMinutes = sleepRecords.length
    ? Math.round(sleepRecords.reduce((sum, s) => sum + s.durationMinutes, 0) / sleepRecords.length)
    : null;

  const activeGoals = goals.filter((g) => g.status === "active").slice(0, 6);

  return {
    thisWeek: aggregatePercent(weekDays),
    thisMonth: aggregatePercent(monthDays),
    monthLabel: DateTime.fromISO(today).toFormat("MMMM"),
    goals: activeGoals.map((g) => ({ id: g.id, title: g.title, percent: g.progress.percent })),
    sleepAvgMinutes,
    currentStreak,
    longestStreak,
  };
}

export interface TrendBucket {
  label: string;
  start: string;
  completed: number;
  total: number;
  percent: number;
}

function sumBucket(days: DayHistorySummary[], startStr: string, endStr: string): { completed: number; total: number } {
  const inBucket = days.filter((d) => d.date >= startStr && d.date <= endStr);
  return {
    completed: inBucket.reduce((sum, d) => sum + d.tasksCompleted, 0),
    total: inBucket.reduce((sum, d) => sum + d.tasksTotal, 0),
  };
}

function toBucket(label: string, start: string, sums: { completed: number; total: number }): TrendBucket {
  return { label, start, ...sums, percent: sums.total === 0 ? 0 : Math.round((sums.completed / sums.total) * 100) };
}

/**
 * Completion-% trend over multiple periods — "deeper" than the dashboard's
 * single this-week/this-month numbers. Buckets are computed from one
 * getHistoryRange call spanning the full window rather than one query per
 * bucket; empty weeks/months correctly show 0%, not a gap.
 */
export async function getTrends(userId: string, timezone: string): Promise<{ weekly: TrendBucket[]; monthly: TrendBucket[] }> {
  const today = todayInTimezone(timezone);
  const todayDt = DateTime.fromISO(today);
  const WEEKS_BACK = 8;
  const MONTHS_BACK = 6;

  const weeklyRangeStart = todayDt.startOf("week").minus({ weeks: WEEKS_BACK - 1 }).toISODate()!;
  const monthlyRangeStart = todayDt.startOf("month").minus({ months: MONTHS_BACK - 1 }).toISODate()!;
  const rangeStart = weeklyRangeStart < monthlyRangeStart ? weeklyRangeStart : monthlyRangeStart;

  const days = await getHistoryRange(userId, rangeStart, today);

  const weekly: TrendBucket[] = [];
  for (let i = WEEKS_BACK - 1; i >= 0; i--) {
    const weekStart = todayDt.startOf("week").minus({ weeks: i });
    const weekEnd = weekStart.plus({ days: 6 });
    const startStr = weekStart.toISODate()!;
    weekly.push(toBucket(weekStart.toFormat("MMM d"), startStr, sumBucket(days, startStr, weekEnd.toISODate()!)));
  }

  const monthly: TrendBucket[] = [];
  for (let i = MONTHS_BACK - 1; i >= 0; i--) {
    const monthStart = todayDt.startOf("month").minus({ months: i });
    const monthEnd = monthStart.endOf("month");
    const startStr = monthStart.toISODate()!;
    monthly.push(toBucket(monthStart.toFormat("MMM"), startStr, sumBucket(days, startStr, monthEnd.toISODate()!)));
  }

  return { weekly, monthly };
}

/** All-time totals shown on the analytics page. */
export async function getLifetimeStats(userId: string) {
  const rows = await queryRaw<{ tasksCompleted: string; focusedMinutes: string; activeDays: string }>(
    `
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed') AS tasks_completed,
      COALESCE(SUM(focused_minutes), 0) AS focused_minutes,
      COUNT(DISTINCT scheduled_date) FILTER (WHERE status = 'completed') AS active_days
    FROM task_occurrences
    WHERE user_id = ?
  `,
    [userId],
  );
  const row = rows[0];
  return {
    tasksCompleted: Number(row?.tasksCompleted ?? 0),
    focusedMinutes: Number(row?.focusedMinutes ?? 0),
    activeDays: Number(row?.activeDays ?? 0),
  };
}
