import { api } from "./client";
import type { TaskOccurrence } from "../types";

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  areaId?: string | null;
  goalId?: string | null;
  targetId?: string | null;
  priority?: string;
  scheduledDate: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
}

export function createTask(input: CreateTaskInput) {
  return api.post<{ task: unknown; occurrence: TaskOccurrence }>("/tasks", input);
}

export interface CreateRecurringTaskInput {
  title: string;
  description?: string | null;
  areaId?: string | null;
  goalId?: string | null;
  targetId?: string | null;
  priority?: string;
  recurrenceType: "daily" | "weekdays" | "weekly" | "monthly" | "custom";
  recurrenceConfig?: { daysOfWeek?: number[]; dayOfMonth?: number; intervalDays?: number };
  recurrenceStartDate: string;
  recurrenceEndDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
}

export function createRecurringTask(input: CreateRecurringTaskInput) {
  return api.post<{ task: unknown }>("/tasks/recurring", input);
}

export function stopRecurringTask(taskId: string) {
  return api.post<{ task: unknown }>(`/tasks/${taskId}/stop-recurring`);
}

export function deleteTask(id: string) {
  return api.delete<void>(`/tasks/${id}`);
}

export function startOccurrence(id: string) {
  return api.post<{ occurrence: TaskOccurrence }>(`/occurrences/${id}/start`);
}

export function completeOccurrence(id: string) {
  return api.post<{ occurrence: TaskOccurrence }>(`/occurrences/${id}/complete`);
}

export function reopenOccurrence(id: string) {
  return api.post<{ occurrence: TaskOccurrence }>(`/occurrences/${id}/reopen`);
}

export function skipOccurrence(id: string) {
  return api.post<{ occurrence: TaskOccurrence }>(`/occurrences/${id}/skip`);
}

export function cancelOccurrence(id: string) {
  return api.post<{ occurrence: TaskOccurrence }>(`/occurrences/${id}/cancel`);
}

export function startFocus(id: string) {
  return api.post<{ occurrence: TaskOccurrence }>(`/occurrences/${id}/focus/start`);
}

export function stopFocus(id: string) {
  return api.post<{ occurrence: TaskOccurrence }>(`/occurrences/${id}/focus/stop`);
}

export function rescheduleOccurrence(id: string, newDate: string) {
  return api.post<{ previous: TaskOccurrence; next: TaskOccurrence }>(`/occurrences/${id}/reschedule`, { newDate });
}

export function listOccurrencesInRange(from: string, to: string) {
  return api.get<{ occurrences: TaskOccurrence[] }>(`/occurrences?from=${from}&to=${to}`);
}
