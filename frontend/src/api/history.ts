import { api } from "./client";
import type { DayHistorySummary } from "../types";

export function getHistoryRange(from: string, to: string) {
  return api.get<{ days: DayHistorySummary[] }>(`/history?from=${from}&to=${to}`);
}
