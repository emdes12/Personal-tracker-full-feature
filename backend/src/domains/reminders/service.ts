import { db } from "../../db/index";
import type { ReminderOffsetType, TaskOccurrenceRow, TaskReminderRow } from "../../db/types";
import { BadRequestError, NotFoundError } from "../../lib/errors";

const OFFSET_MINUTES: Record<string, number> = {
  at_start: 0,
  "5_min": 5,
  "10_min": 10,
  "15_min": 15,
};

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
    .insert({ userId, occurrenceId: input.occurrenceId, offsetType: input.offsetType, offsetMinutes, remindAt })
    .returning("*");
  return row;
}

export function listRemindersForOccurrence(userId: string, occurrenceId: string): Promise<TaskReminderRow[]> {
  return db<TaskReminderRow>("task_reminders").where({ userId, occurrenceId });
}

export interface DueReminder {
  id: string;
  occurrenceId: string;
  remindAt: Date;
  title: string;
  startAt: Date | null;
}

/** Reminders due now, joined with their occurrence's title — polled by the frontend while the app is open. */
export function listDueReminders(userId: string): Promise<DueReminder[]> {
  const now = new Date();
  return db<TaskReminderRow>("task_reminders as r")
    .innerJoin("task_occurrences as o", "r.occurrenceId", "o.id")
    .where("r.userId", userId)
    .andWhere("r.isSent", false)
    .andWhere("r.remindAt", "<=", now)
    .select("r.id", "r.occurrenceId", "r.remindAt", { title: "o.title", startAt: "o.startAt" });
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
