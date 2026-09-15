import { api } from "./client";
import type { DailyReview, DailySummary } from "../types";

export function getReview(date: string) {
  return api.get<{ review: DailyReview | null; summary: DailySummary }>(`/reviews?date=${date}`);
}

export function saveReview(date: string, input: { accomplished?: string | null; blockers?: string | null; focusTomorrow?: string | null }) {
  return api.put<{ review: DailyReview }>(`/reviews?date=${date}`, input);
}
