import { Capacitor } from "@capacitor/core";
import { api, setNativeToken } from "./client";
import type { User } from "../types";

// The native app's origin (http://localhost) is cross-site to the API, so the
// SameSite=Lax cookie is never sent; it authenticates with a bearer token
// instead. The web app keeps using the httpOnly cookie only.
function rememberToken(res: { token?: string }) {
  if (Capacitor.isNativePlatform() && res.token) setNativeToken(res.token);
}

export async function signup(input: { email: string; password: string; name?: string; timezone?: string }) {
  const res = await api.post<{ user: User; token?: string }>("/auth/signup", input);
  rememberToken(res);
  return res;
}

export async function login(input: { email: string; password: string }) {
  const res = await api.post<{ user: User; token?: string }>("/auth/login", input);
  rememberToken(res);
  return res;
}

export async function logout() {
  try {
    await api.post<void>("/auth/logout");
  } finally {
    setNativeToken(null);
  }
}

export function me() {
  return api.get<{ user: User }>("/auth/me");
}
