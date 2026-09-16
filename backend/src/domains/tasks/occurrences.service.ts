import { db } from "../../db/index";
import type { OccurrenceStatus, TaskOccurrenceRow, TaskPriority } from "../../db/types";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { combineToUtc } from "../../lib/time";
import { syncRemindersForOccurrence } from "../reminders/service";

const OPEN_STATUSES = ["todo", "in_progress"] as const;

export async function getOccurrence(userId: string, occurrenceId: string): Promise<TaskOccurrenceRow> {
  const row = await db<TaskOccurrenceRow>("task_occurrences").where({ id: occurrenceId, userId }).first();
  if (!row) throw new NotFoundError("Task occurrence not found");
  return row;
}

/** All occurrences whose scheduled_date falls within [from, to] inclusive. */
export function listOccurrencesInRange(userId: string, from: string, to: string): Promise<TaskOccurrenceRow[]> {
  return db<TaskOccurrenceRow>("task_occurrences")
    .where({ userId })
    .whereBetween("scheduledDate", [from, to])
    .orderBy([{ column: "scheduledDate", order: "asc" }, { column: "startAt", order: "asc" }]);
}

/** Auto-surfaced carried-over occurrences: still open, scheduled before `date`. No user action required for these to appear. */
export function listCarriedOver(userId: string, beforeDate: string): Promise<TaskOccurrenceRow[]> {
  return db<TaskOccurrenceRow>("task_occurrences")
    .where({ userId })
    .where("scheduledDate", "<", beforeDate)
    .whereIn("status", [...OPEN_STATUSES])
    .orderBy("scheduledDate", "asc");
}

export function listOccurrencesForDate(userId: string, date: string): Promise<TaskOccurrenceRow[]> {
  return db<TaskOccurrenceRow>("task_occurrences").where({ userId, scheduledDate: date }).orderBy("startAt", "asc");
}

async function setStatus(
  userId: string,
  occurrenceId: string,
  status: OccurrenceStatus,
  extra: Partial<TaskOccurrenceRow> = {},
): Promise<TaskOccurrenceRow> {
  const [row] = await db<TaskOccurrenceRow>("task_occurrences")
    .where({ id: occurrenceId, userId })
    .update({ status, updatedAt: new Date(), ...extra })
    .returning("*");
  if (!row) throw new NotFoundError("Task occurrence not found");
  await syncRemindersForOccurrence(row);
  return row;
}

export function startOccurrence(userId: string, occurrenceId: string) {
  return setStatus(userId, occurrenceId, "in_progress");
}

/** Completing while a focus session is running stops it first so the elapsed time isn't lost. */
export async function completeOccurrence(userId: string, occurrenceId: string) {
  const existing = await getOccurrence(userId, occurrenceId);
  if (existing.focusStartedAt) {
    await stopFocus(userId, occurrenceId);
  }
  return setStatus(userId, occurrenceId, "completed", { completedAt: new Date() });
}

/** Un-complete: explicit correction if a task was marked done by mistake. */
export function reopenOccurrence(userId: string, occurrenceId: string) {
  return setStatus(userId, occurrenceId, "todo", { completedAt: null });
}

export function skipOccurrence(userId: string, occurrenceId: string) {
  return setStatus(userId, occurrenceId, "skipped");
}

export function cancelOccurrence(userId: string, occurrenceId: string) {
  return setStatus(userId, occurrenceId, "cancelled");
}

/** Starts a focus session: marks in_progress and records when focus began, unless one is already running. */
export async function startFocus(userId: string, occurrenceId: string): Promise<TaskOccurrenceRow> {
  const existing = await getOccurrence(userId, occurrenceId);
  if (existing.focusStartedAt) return existing;
  const [row] = await db<TaskOccurrenceRow>("task_occurrences")
    .where({ id: occurrenceId, userId })
    .update({ focusStartedAt: new Date(), status: existing.status === "todo" ? "in_progress" : existing.status, updatedAt: new Date() })
    .returning("*");
  return row;
}

/** Stops a running focus session and folds the elapsed minutes into focusedMinutes. A no-op if nothing is running. */
export async function stopFocus(userId: string, occurrenceId: string): Promise<TaskOccurrenceRow> {
  const existing = await getOccurrence(userId, occurrenceId);
  if (!existing.focusStartedAt) return existing;
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - existing.focusStartedAt.getTime()) / 60_000));
  const [row] = await db<TaskOccurrenceRow>("task_occurrences")
    .where({ id: occurrenceId, userId })
    .update({ focusStartedAt: null, focusedMinutes: existing.focusedMinutes + elapsedMinutes, updatedAt: new Date() })
    .returning("*");
  return row;
}

export async function updateOccurrence(
  userId: string,
  occurrenceId: string,
  timezone: string,
  input: {
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    startTime?: string | null;
    endTime?: string | null;
    durationMinutes?: number | null;
  },
): Promise<TaskOccurrenceRow> {
  const existing = await getOccurrence(userId, occurrenceId);

  const patch: Partial<TaskOccurrenceRow> = { updatedAt: new Date() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.durationMinutes !== undefined) patch.durationMinutes = input.durationMinutes;

  if (input.startTime !== undefined) patch.startAt = combineToUtc(existing.scheduledDate, input.startTime, timezone);
  if (input.endTime !== undefined) patch.endAt = combineToUtc(existing.scheduledDate, input.endTime, timezone);

  const nextStart = patch.startAt !== undefined ? patch.startAt : existing.startAt;
  const nextEnd = patch.endAt !== undefined ? patch.endAt : existing.endAt;
  if (nextStart && nextEnd && nextEnd <= nextStart) {
    throw new BadRequestError("endTime must be after startTime");
  }

  const [row] = await db<TaskOccurrenceRow>("task_occurrences").where({ id: occurrenceId, userId }).update(patch).returning("*");
  if (!row) throw new NotFoundError("Task occurrence not found");
  await syncRemindersForOccurrence(row);
  return row;
}

/**
 * Carry-over / reschedule: creates a *new* occurrence on `newDate` and
 * flips the current one to 'rescheduled', preserving history instead of
 * overwriting it (see progress/service.ts for why 'rescheduled' rows are
 * excluded from progress denominators). Only open (todo/in_progress)
 * occurrences can be rescheduled.
 */
export async function rescheduleOccurrence(userId: string, occurrenceId: string, timezone: string, newDate: string) {
  const existing = await getOccurrence(userId, occurrenceId);
  if (!OPEN_STATUSES.includes(existing.status as (typeof OPEN_STATUSES)[number])) {
    throw new BadRequestError(`Cannot reschedule an occurrence with status '${existing.status}'`);
  }

  return db.transaction(async (trx) => {
    const startTimeStr = existing.startAt ? toLocalHHMM(existing.startAt, timezone) : null;
    const endTimeStr = existing.endAt ? toLocalHHMM(existing.endAt, timezone) : null;

    const [next] = await trx<TaskOccurrenceRow>("task_occurrences")
      .insert({
        userId,
        taskId: existing.taskId,
        areaId: existing.areaId,
        goalId: existing.goalId,
        targetId: existing.targetId,
        title: existing.title,
        description: existing.description,
        priority: existing.priority,
        scheduledDate: newDate,
        startAt: combineToUtc(newDate, startTimeStr, timezone),
        endAt: combineToUtc(newDate, endTimeStr, timezone),
        durationMinutes: existing.durationMinutes,
        rescheduledFromId: existing.id,
      })
      .returning("*");

    const [prev] = await trx<TaskOccurrenceRow>("task_occurrences")
      .where({ id: existing.id })
      .update({ status: "rescheduled", rescheduledToId: next.id, updatedAt: new Date() })
      .returning("*");

    await syncRemindersForOccurrence(prev, trx);
    await syncRemindersForOccurrence(next, trx);

    return { previous: prev, next };
  });
}

function toLocalHHMM(utcDate: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(utcDate);
}
