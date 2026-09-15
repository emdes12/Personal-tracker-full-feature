import { api } from "./client";
import type { User } from "../types";

export function signup(input: { email: string; password: string; name?: string; timezone?: string }) {
  return api.post<{ user: User }>("/auth/signup", input);
}

export function login(input: { email: string; password: string }) {
  return api.post<{ user: User }>("/auth/login", input);
}

export function logout() {
  return api.post<void>("/auth/logout");
}

export function me() {
  return api.get<{ user: User }>("/auth/me");
}
