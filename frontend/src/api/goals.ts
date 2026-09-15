import { api } from "./client";
import type { Goal, Target } from "../types";

export function listGoals() {
  return api.get<{ goals: Goal[] }>("/goals");
}

export function getGoal(id: string) {
  return api.get<{ goal: Goal; targets: Target[] }>(`/goals/${id}`);
}

export function createGoal(input: {
  title: string;
  description?: string | null;
  planId?: string | null;
  areaId?: string | null;
  priority?: string;
  startDate?: string | null;
  deadline?: string | null;
}) {
  return api.post<{ goal: Goal }>("/goals", input);
}

export function updateGoal(id: string, input: Partial<{ title: string; description: string | null; status: string; priority: string; deadline: string | null; areaId: string | null; planId: string | null }>) {
  return api.patch<{ goal: Goal }>(`/goals/${id}`, input);
}

export function deleteGoal(id: string) {
  return api.delete<void>(`/goals/${id}`);
}
