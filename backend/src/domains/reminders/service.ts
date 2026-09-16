import type { Knex } from "knex";
import { db } from "../../db/index";
import type { ReminderKind, ReminderOffsetType, TaskOccurrenceRow, TaskReminderRow } from "../../db/types";
import { BadRequestError, NotFoundError } from "../../lib/errors";

const OFFSET_MINUTES: Record<string, number> = {
  at_start: 0,
  "5_min": 5,
  "10_min": 10,
  "15_min": 15,
};

// "About to start" gets a few minutes' lead time; "task ended" fires right
// at the end time — these are the app's automatic alarms, distinct from
// the manual createReminder() below which a user can still call for a
// custom lead time on top of the automatic ones.
const AUTO_START_LEAD_MINUTES = 5;
const OPEN_STATUSES = new Set(["todo", "in_progress"]);

async function upsertAutoReminder(trx: Knex, occurrence: TaskOccurrenceRow, kind: ReminderKind, remindAt: Date, anchorAt: Date) {
  // The lead-time reminder (e.g. "5 min before start") can land in the past
  // even though the event itself hasn't happened yet — a task created with
  // a start time 2 minutes out is the common case. Falling back to the
  // anchor time (the actual start/end) means it still fires, just without
  // the full lead time, instead of being silently dropped. Only a moment
  // that's *itself* already passed (a backdated task, a reschedule into the
  // past) is truly skipped — firing an alarm for something already over
  // would be surprising, not useful.
  const effectiveRemindAt = remindAt.getTime() >= Date.now() ? remindAt : anchorAt;
  if (effectiveRemindAt.getTime() < Date.now()) {
    await trx<TaskReminderRow>("task_reminders").where({ occurrenceId: occurrence.id, kind, isSent: false }).del();
    return;
  }
  remindAt = effectiveRemindAt;

  const existing = await trx<TaskReminderRow>("task_reminders").where({ occurrenceId: occurrence.id, kind, isSent: false }).first();
  if (existing) {
    if (existing.remindAt.getTime() !== remindAt.getTime()) {
      await trx<TaskReminderRow>("task_reminders").where({ id: existing.id }).update({ remindAt });
    }
    return;
  }

  await trx<TaskReminderRow>("task_reminders").insert({
    userId: occurrence.userId,
    occurrenceId: occurrence.id,
    kind,
    offsetType: kind === "start" ? "5_min" : "at_start",
    offsetMinutes: kind === "start" ? AUTO_START_LEAD_MINUTES : 0,
    remindAt,
  });
}

/**
 * Keeps an occurrence's automatic start/end alarms in sync with its current
 * schedule and status — call this after creating, rescheduling, retiming,
 * or changing the status of any occurrence. Idempotent: safe to call on
 * every write. Terminal/superseded occurrences (completed, cancelled,
 * skipped, rescheduled-away) get their pending auto-alarms cleared instead.
 */
export async function syncRemindersForOccurrence(occurrence: TaskOccurrenceRow, trx: Knex = db): Promise<void> {
  if (!OPEN_STATUSES.has(occurrence.status)) {
    await trx<TaskReminderRow>("task_reminders").where({ occurrenceId: occurrence.id, isSent: false }).del();
    return;
  }

  if (occurrence.startAt) {
    const leadRemindAt = new Date(occurrence.startAt.getTime() - AUTO_START_LEAD_MINUTES * 60_000);
    await upsertAutoReminder(trx, occurrence, "start", leadRemindAt, occurrence.startAt);
  } else {
    await trx<TaskReminderRow>("task_reminders").where({ occurrenceId: occurrence.id, kind: "start", isSent: false }).del();
  }

  if (occurrence.endAt) {
    await upsertAutoReminder(trx, occurrence, "end", occurrence.endAt, occurrence.endAt);
  } else {
    await trx<TaskReminderRow>("task_reminders").where({ occurrenceId: occurrence.id, kind: "end", isSent: false }).del();
  }
}

/** Manual, user-requested reminder on top of the automatic start/end alarms — e.g. "10 minutes before" instead of the default 5. */
export async function createReminder(
  userId: string,
  input: { occurrenceId: string; offsetType: ReminderOffsetType; customMinutes?: number },
): Promise<TaskReminderRow> {
  const occurrence = await db<TaskOccurrenceRow>("task_occurrences").where({ id: input.occurrenceId, userId }).first();
  if (!occurrence) throw new NotFoundError("Task occurrence not found");
  if (!occurrence.startAt) throw new BadRequestError("This task has no start time to remind you about");

  const offsetMinutes = input.offsetType === "custom" ? (input.customMinutes ?? 0) : OFFSET_MINUTES[input.offsetType];
  if (offsetMinutes < 0) throw new BadRequestError("offsetMinutes must be zero or positive");

  const remindAt = new Date(occurrence.startAt.getTime() - offsetMinutes * 60_000);

  const [row] = await db<TaskReminderRow>("task_reminders")
    .insert({ userId, occurrenceId: input.occurrenceId, kind: "start", offsetType: input.offsetType, offsetMinutes, remindAt })
    .returning("*");
  return row;
}

export function listRemindersForOccurrence(userId: string, occurrenceId: string): Promise<TaskReminderRow[]> {
  return db<TaskReminderRow>("task_reminders").where({ userId, occurrenceId });
}

export interface DueReminder {
  id: string;
  occurrenceId: string;
  kind: ReminderKind;
  remindAt: Date;
  title: string;
  startAt: Date | null;
  endAt: Date | null;
}

/** Reminders due now, joined with their occurrence's title — polled by the frontend while the app is open (and scheduled natively on mobile — see the Capacitor local-notifications wiring). */
export function listDueReminders(userId: string): Promise<DueReminder[]> {
  const now = new Date();
  return db<TaskReminderRow>("task_reminders as r")
    .innerJoin("task_occurrences as o", "r.occurrenceId", "o.id")
    .where("r.userId", userId)
    .andWhere("r.isSent", false)
    .andWhere("r.remindAt", "<=", now)
    .select("r.id", "r.occurrenceId", "r.kind", "r.remindAt", { title: "o.title", startAt: "o.startAt", endAt: "o.endAt" });
}

/** Not-yet-due upcoming alarms — used to schedule native local notifications ahead of time on mobile, since a phone app can't rely on a 30s poll while backgrounded. */
export interface UpcomingReminder extends DueReminder {}
export function listUpcomingReminders(userId: string, withinHours = 36): Promise<UpcomingReminder[]> {
  const now = new Date();
  const until = new Date(now.getTime() + withinHours * 60 * 60_000);
  return db<TaskReminderRow>("task_reminders as r")
    .innerJoin("task_occurrences as o", "r.occurrenceId", "o.id")
    .where("r.userId", userId)
    .andWhere("r.isSent", false)
    .andWhere("r.remindAt", ">", now)
    .andWhere("r.remindAt", "<=", until)
    .select("r.id", "r.occurrenceId", "r.kind", "r.remindAt", { title: "o.title", startAt: "o.startAt", endAt: "o.endAt" });
}

export async function markReminderSent(userId: string, reminderId: string): Promise<TaskReminderRow> {
  const [row] = await db<TaskReminderRow>("task_reminders")
    .where({ id: reminderId, userId })
    .update({ isSent: true, sentAt: new Date() })
    .returning("*");
  if (!row) throw new NotFoundError("Reminder not found");
  return row;
}

export async function deleteReminder(userId: string, reminderId: string): Promise<void> {
  const count = await db<TaskReminderRow>("task_reminders").where({ id: reminderId, userId }).del();
  if (count === 0) throw new NotFoundError("Reminder not found");
}
