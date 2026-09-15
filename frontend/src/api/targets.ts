import { api } from "./client";
import type { Target } from "../types";

export function createTarget(input: {
  goalId: string;
  parentTargetId?: string | null;
  type?: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
}) {
  return api.post<{ target: Target }>("/targets", input);
}

export function deleteTarget(id: string) {
  return api.delete<void>(`/targets/${id}`);
}
