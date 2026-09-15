import { db } from "../../db/index";
import type { SleepRecordRow } from "../../db/types";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { combineToUtc } from "../../lib/time";

export interface SleepInput {
  sleepDate: string; // calendar date you went to sleep
  sleepTime: string; // "HH:MM"
  wakeDate: string; // calendar date you woke up (this is the record's "date")
  wakeTime: string; // "HH:MM"
  quality?: "poor" | "fair" | "good" | "excellent" | null;
  notes?: string | null;
}

function computeTimes(input: SleepInput, timezone: string) {
  const sleepAt = combineToUtc(input.sleepDate, input.sleepTime, timezone)!;
  const wakeAt = combineToUtc(input.wakeDate, input.wakeTime, timezone)!;
  if (wakeAt <= sleepAt) {
    throw new BadRequestError("Wake time must be after sleep time");
  }
  const durationMinutes = Math.round((wakeAt.getTime() - sleepAt.getTime()) / 60000);
  return { sleepAt, wakeAt, durationMinutes };
}

export async function createSleepRecord(userId: string, timezone: string, input: SleepInput): Promise<SleepRecordRow> {
  const { sleepAt, wakeAt, durationMinutes } = computeTimes(input, timezone);
  const [row] = await db<SleepRecordRow>("sleep_records")
    .insert({
      userId,
      date: input.wakeDate,
      sleepAt,
      wakeAt,
      durationMinutes,
      quality: input.quality ?? null,
      notes: input.notes ?? null,
    })
    .returning("*");
  return row;
}

export async function updateSleepRecord(userId: string, recordId: string, timezone: string, input: SleepInput): Promise<SleepRecordRow> {
  const { sleepAt, wakeAt, durationMinutes } = computeTimes(input, timezone);
  const [row] = await db<SleepRecordRow>("sleep_records")
    .where({ id: recordId, userId })
    .update({
      date: input.wakeDate,
      sleepAt,
      wakeAt,
      durationMinutes,
      quality: input.quality ?? null,
      notes: input.notes ?? null,
      updatedAt: new Date(),
    })
    .returning("*");
  if (!row) throw new NotFoundError("Sleep record not found");
  return row;
}

export async function deleteSleepRecord(userId: string, recordId: string): Promise<void> {
  const count = await db<SleepRecordRow>("sleep_records").where({ id: recordId, userId }).del();
  if (count === 0) throw new NotFoundError("Sleep record not found");
}

export function getSleepRecordForDate(userId: string, date: string): Promise<SleepRecordRow | undefined> {
  return db<SleepRecordRow>("sleep_records").where({ userId, date }).orderBy("createdAt", "desc").first();
}

export function listSleepRecordsInRange(userId: string, from: string, to: string): Promise<SleepRecordRow[]> {
  return db<SleepRecordRow>("sleep_records").where({ userId }).whereBetween("date", [from, to]).orderBy("date", "desc");
}
