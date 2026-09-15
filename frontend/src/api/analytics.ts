import { api } from "./client";
import type { DashboardStats, LifetimeStats } from "../types";

export function getDashboardStats() {
  return api.get<DashboardStats>("/analytics/dashboard");
}

export function getLifetimeStats() {
  return api.get<LifetimeStats>("/analytics/lifetime");
}
