import { DateTime } from "luxon";
import { db } from "../../db/index";
import type { RecurrenceType, TaskOccurrenceRow, TaskPriority, TaskRow } from "../../db/types";
import { BadRequestError } from "../../lib/errors";
import { combineToUtc, todayInTimezone } from "../../lib/time";
import { occurrenceDatesInRange } from "./recurrence";
import { syncRemindersForOccurrence } from "../reminders/service";

const ROLLING_WINDOW_DAYS = 14;
// Cap how far forward a single generation pass ever inserts, so a daily
// recurrence with no end date can't produce an unbounded burst of rows.
const MAX_GENERATION_SPAN_DAYS = 120;

export interface CreateRecurringTaskInput {
  title: string;
  description?: string | null;
  areaId?: string | null;
  goalId?: string | null;
  targetId?: string | null;
  priority?: TaskPriority;
  recurrenceType: RecurrenceType;
  recurrenceConfig?: Record<string, unknown>;
  recurrenceStartDate: string;
  recurrenceEndDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
}

async function generateOccurrencesForTask(task: TaskRow, timezone: string, fromDate: string, toDate: string) {
  if (fromDate > toDate) return;
  const candidateDates = occurrenceDatesInRange(task, fromDate, toDate);
  if (candidateDates.length === 0) return;

  const existing = await db<TaskOccurrenceRow>("task_occurrences")
    .where({ taskId: task.id })
    .whereBetween("scheduledDate", [fromDate, toDate])
    .select("scheduledDate");
  const existingDates = new Set(existing.map((o) => o.scheduledDate));
  const missingDates = candidateDates.filter((d) => !existingDates.has(d));
  if (missingDates.length === 0) return;

  const startTime = task.defaultStartTime;
  const endTime = task.defaultEndTime;

  const inserted = await db<TaskOccurrenceRow>("task_occurrences")
    .insert(
      missingDates.map((scheduledDate) => ({
        userId: task.userId,
        taskId: task.id,
        areaId: task.areaId,
        goalId: task.goalId,
        targetId: task.targetId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        scheduledDate,
        startAt: combineToUtc(scheduledDate, startTime, timezone),
        endAt: combineToUtc(scheduledDate, endTime, timezone),
        durationMinutes: task.defaultDurationMinutes,
      })),
    )
    .returning("*");

  for (const occurrence of inserted) {
    await syncRemindersForOccurrence(occurrence);
  }
}

export async function createRecurringTask(userId: string, timezone: string, input: CreateRecurringTaskInput): Promise<TaskRow> {
  if (input.recurrenceEndDate && input.recurrenceEndDate < input.recurrenceStartDate) {
    throw new BadRequestError("recurrenceEndDate must be on or after recurrenceStartDate");
  }
  const startAtCheck = combineToUtc(input.recurrenceStartDate, input.startTime, timezone);
  const endAtCheck = combineToUtc(input.recurrenceStartDate, input.endTime, timezone);
  if (startAtCheck && endAtCheck && endAtCheck <= startAtCheck) {
    throw new BadRequestError("endTime must be after startTime");
  }

  const [task] = await db<TaskRow>("tasks")
    .insert({
      userId,
      areaId: input.areaId ?? null,
      goalId: input.goalId ?? null,
      targetId: input.targetId ?? null,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? "medium",
      defaultStartTime: input.startTime ?? null,
      defaultEndTime: input.endTime ?? null,
      defaultDurationMinutes: input.durationMinutes ?? null,
      isRecurring: true,
      recurrenceType: input.recurrenceType,
      recurrenceConfig: input.recurrenceConfig ?? {},
      recurrenceStartDate: input.recurrenceStartDate,
      recurrenceEndDate: input.recurrenceEndDate ?? null,
    })
    .returning("*");

  const today = todayInTimezone(timezone);
  const windowEnd = DateTime.fromISO(today).plus({ days: ROLLING_WINDOW_DAYS }).toISODate()!;
  const cappedEnd = input.recurrenceEndDate && input.recurrenceEndDate < windowEnd ? input.recurrenceEndDate : windowEnd;
  const generateFrom = input.recurrenceStartDate;
  const maxSpanEnd = DateTime.fromISO(generateFrom).plus({ days: MAX_GENERATION_SPAN_DAYS }).toISODate()!;
  const generateTo = cappedEnd < maxSpanEnd ? cappedEnd : maxSpanEnd;

  await generateOccurrencesForTask(task, timezone, generateFrom, generateTo);

  return task;
}

/**
 * Rolling generation: extends every active recurring task's occurrences
 * forward to `today + ROLLING_WINDOW_DAYS`. Called opportunistically from
 * read paths (Today view, range queries) instead of a background job —
 * idempotent, so calling it repeatedly is cheap once the window is filled.
 */
export async function ensureRollingOccurrences(userId: string, timezone: string) {
  const today = todayInTimezone(timezone);
  const windowEnd = DateTime.fromISO(today).plus({ days: ROLLING_WINDOW_DAYS }).toISODate()!;

  const activeRecurring = await db<TaskRow>("tasks").where({ userId, isRecurring: true, isActive: true });

  for (const task of activeRecurring) {
    if (!task.recurrenceStartDate) continue;
    const from = task.recurrenceStartDate > today ? task.recurrenceStartDate : today;
    const to = task.recurrenceEndDate && task.recurrenceEndDate < windowEnd ? task.recurrenceEndDate : windowEnd;
    await generateOccurrencesForTask(task, timezone, from, to);
  }
}

export async function stopRecurringTask(userId: string, taskId: string): Promise<TaskRow> {
  const [row] = await db<TaskRow>("tasks")
    .where({ id: taskId, userId, isRecurring: true })
    .update({ isActive: false, updatedAt: new Date() })
    .returning("*");
  return row;
}
