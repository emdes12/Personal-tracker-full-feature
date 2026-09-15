import { api } from "./client";

export function getStreak(goalId?: string) {
  const q = goalId ? `?goalId=${goalId}` : "";
  return api.get<{ streak: number; longest: number }>(`/streaks${q}`);
}
