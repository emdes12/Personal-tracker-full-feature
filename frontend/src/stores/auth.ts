import { defineStore } from "pinia";
import { ref } from "vue";
import * as authApi from "../api/auth";
import type { User } from "../types";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const initialized = ref(false);
  const loading = ref(false);

  async function fetchMe() {
    loading.value = true;
    try {
      const res = await authApi.me();
      user.value = res.user;
    } catch {
      user.value = null;
    } finally {
      initialized.value = true;
      loading.value = false;
    }
  }

  async function login(email: string, password: string) {
    const res = await authApi.login({ email, password });
    user.value = res.user;
  }

  async function signup(email: string, password: string, name: string | undefined, timezone: string) {
    const res = await authApi.signup({ email, password, name, timezone });
    user.value = res.user;
  }

  async function logout() {
    await authApi.logout();
    user.value = null;
  }

  return { user, initialized, loading, fetchMe, login, signup, logout };
});
