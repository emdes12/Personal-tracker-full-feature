import { DateTime } from "luxon";
import type { TaskRow } from "../../db/types";

export type RecurrenceType = "daily" | "weekdays" | "weekly" | "monthly" | "custom";

export interface RecurrenceConfig {
  daysOfWeek?: number[]; // ISO weekday: 1 = Monday ... 7 = Sunday (used by "weekly")
  dayOfMonth?: number; // 1-31 (used by "monthly")
  intervalDays?: number; // used by "custom"
}

/**
 * Whether a recurring task template should have an occurrence on `dateStr`.
 * Each occurrence is generated as an independent row (see task_occurrences
 * schema comment) so completing one never affects another.
 */
export function shouldOccurOn(task: TaskRow, dateStr: string): boolean {
  if (!task.recurrenceStartDate || dateStr < task.recurrenceStartDate) return false;
  if (task.recurrenceEndDate && dateStr > task.recurrenceEndDate) return false;

  const date = DateTime.fromISO(dateStr);
  const config = (task.recurrenceConfig ?? {}) as RecurrenceConfig;

  switch (task.recurrenceType as RecurrenceType) {
    case "daily":
      return true;
    case "weekdays":
      return date.weekday >= 1 && date.weekday <= 5;
    case "weekly": {
      const days = config.daysOfWeek?.length ? config.daysOfWeek : [DateTime.fromISO(task.recurrenceStartDate).weekday];
      return days.includes(date.weekday);
    }
    case "monthly": {
      const day = config.dayOfMonth ?? DateTime.fromISO(task.recurrenceStartDate).day;
      return date.day === Math.min(day, date.daysInMonth ?? 28);
    }
    case "custom": {
      const interval = Math.max(config.intervalDays ?? 1, 1);
      const start = DateTime.fromISO(task.recurrenceStartDate);
      const diffDays = Math.round(date.diff(start, "days").days);
      return diffDays >= 0 && diffDays % interval === 0;
    }
    default:
      return false;
  }
}

/** All calendar dates in [fromDate, toDate] (inclusive) where this task should occur. */
export function occurrenceDatesInRange(task: TaskRow, fromDate: string, toDate: string): string[] {
  const dates: string[] = [];
  let cursor = DateTime.fromISO(fromDate);
  const end = DateTime.fromISO(toDate);
  while (cursor <= end) {
    const iso = cursor.toISODate()!;
    if (shouldOccurOn(task, iso)) dates.push(iso);
    cursor = cursor.plus({ days: 1 });
  }
  return dates;
}
