import { api } from "./client";
import type { AnalyticsTrends, DashboardStats, LifetimeStats } from "../types";

export function getDashboardStats() {
  return api.get<DashboardStats>("/analytics/dashboard");
}

export function getLifetimeStats() {
  return api.get<LifetimeStats>("/analytics/lifetime");
}

export function getTrends() {
  return api.get<AnalyticsTrends>("/analytics/trends");
}
