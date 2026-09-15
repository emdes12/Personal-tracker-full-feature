import { api } from "./client";
import type { TodayResponse } from "../types";

export function getToday(date?: string) {
  const query = date ? `?date=${date}` : "";
  return api.get<TodayResponse>(`/today${query}`);
}
