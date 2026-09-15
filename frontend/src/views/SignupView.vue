<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { ApiError } from "../api/client";
import { detectTimezone } from "../lib/date";
import Icon from "../components/Icon.vue";

const name = ref("");
const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

const auth = useAuthStore();
const router = useRouter();

async function handleSubmit() {
  error.value = "";
  loading.value = true;
  try {
    await auth.signup(email.value, password.value, name.value || undefined, detectTimezone());
    router.push("/today");
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : "Something went wrong";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-stone-50 px-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 flex flex-col items-center text-center">
        <div class="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white">
          <Icon name="sun" :size="20" />
        </div>
        <h1 class="mb-1 text-2xl font-semibold text-stone-900">Create your account</h1>
        <p class="text-sm text-stone-500">Plan your life. Execute daily. Track what actually happened.</p>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label class="mb-1 block text-sm font-medium text-stone-700">Name</label>
          <input v-model="name" type="text" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm transition-colors focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-100" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-stone-700">Email</label>
          <input v-model="email" type="email" required class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm transition-colors focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-100" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-stone-700">Password</label>
          <input v-model="password" type="password" required minlength="8" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm transition-colors focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-100" />
          <p class="mt-1 text-xs text-stone-400">At least 8 characters.</p>
        </div>
        <p v-if="error" class="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <Icon name="close" :size="14" /> {{ error }}
        </p>
        <button type="submit" :disabled="loading" class="w-full rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-50">
          {{ loading ? "Creating account…" : "Sign up" }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-stone-500">
        Already have an account? <router-link to="/login" class="font-medium text-stone-900 underline">Log in</router-link>
      </p>
    </div>
  </div>
</template>
