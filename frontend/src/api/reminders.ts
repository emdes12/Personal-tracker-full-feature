import { api } from "./client";

export type ReminderKind = "start" | "end";

export interface DueReminder {
  id: string;
  occurrenceId: string;
  kind: ReminderKind;
  remindAt: string;
  title: string;
  startAt: string | null;
  endAt: string | null;
}

export function listDueReminders() {
  return api.get<{ reminders: DueReminder[] }>("/reminders/due");
}

export function listUpcomingReminders() {
  return api.get<{ reminders: DueReminder[] }>("/reminders/upcoming");
}

export function markReminderSent(id: string) {
  return api.post<void>(`/reminders/${id}/mark-sent`);
}

export function createReminder(occurrenceId: string, offsetType: "at_start" | "5_min" | "10_min" | "15_min" | "custom", customMinutes?: number) {
  return api.post<{ reminder: unknown }>("/reminders", { occurrenceId, offsetType, customMinutes });
}
