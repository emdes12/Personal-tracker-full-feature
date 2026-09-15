import { api } from "./client";
import type { SleepRecord } from "../types";

export interface SleepInput {
  sleepDate: string;
  sleepTime: string;
  wakeDate: string;
  wakeTime: string;
  quality?: string | null;
  notes?: string | null;
}

export function getSleepForDate(date: string) {
  return api.get<{ record: SleepRecord | null }>(`/sleep/for-date?date=${date}`);
}

export function listSleepInRange(from: string, to: string) {
  return api.get<{ records: SleepRecord[] }>(`/sleep?from=${from}&to=${to}`);
}

export function createSleep(input: SleepInput) {
  return api.post<{ record: SleepRecord }>("/sleep", input);
}

export function updateSleep(id: string, input: SleepInput) {
  return api.patch<{ record: SleepRecord }>(`/sleep/${id}`, input);
}
