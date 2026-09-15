import { DateTime } from "luxon";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  return DateTime.fromISO(value).isValid;
}

export function isValidTimezone(tz: string): boolean {
  return DateTime.local().setZone(tz).isValid;
}

/**
 * Combine a local calendar date ("2026-09-15"), an optional "HH:MM" wall
 * clock time, and an IANA timezone into a UTC Date. This is the one place
 * date+time+timezone math happens so scheduling and carry-over stay correct
 * regardless of the server's own timezone.
 */
export function combineToUtc(dateStr: string, timeStr: string | null | undefined, timezone: string): Date | null {
  if (!timeStr) return null;
  if (!TIME_RE.test(timeStr)) throw new Error(`Invalid time string: ${timeStr}`);
  const [hour, minute] = timeStr.split(":").map(Number);
  const dt = DateTime.fromISO(dateStr, { zone: timezone }).set({ hour, minute, second: 0, millisecond: 0 });
  if (!dt.isValid) throw new Error(`Invalid date/time/timezone combination: ${dateStr} ${timeStr} ${timezone}`);
  return dt.toUTC().toJSDate();
}

/** The user's current local calendar date, as "YYYY-MM-DD". */
export function todayInTimezone(timezone: string): string {
  return DateTime.now().setZone(timezone).toISODate() ?? DateTime.now().toISODate()!;
}

export function nowUtc(): Date {
  return new Date();
}
