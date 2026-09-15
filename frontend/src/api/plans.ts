import { api } from "./client";
import type { Plan } from "../types";

export function listPlans() {
  return api.get<{ plans: Plan[] }>("/plans");
}

export function createPlan(input: { name: string; description?: string | null; type?: string; startDate?: string | null; endDate?: string | null }) {
  return api.post<{ plan: Plan }>("/plans", input);
}

export function deletePlan(id: string) {
  return api.delete<void>(`/plans/${id}`);
}
