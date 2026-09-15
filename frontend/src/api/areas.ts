import { api } from "./client";
import type { Area } from "../types";

export function listAreas() {
  return api.get<{ areas: Area[] }>("/areas");
}
