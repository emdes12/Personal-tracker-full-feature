<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import Icon from "./Icon.vue";
import type { IconName } from "./Icon.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const links: { to: string; label: string; icon: IconName }[] = [
  { to: "/today", label: "Today", icon: "sun" },
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/goals", label: "Goals", icon: "target" },
  { to: "/calendar", label: "Calendar", icon: "calendar" },
  { to: "/history", label: "History", icon: "history" },
  { to: "/plans", label: "Plans", icon: "layers" },
];

async function handleLogout() {
  await auth.logout();
  router.push("/login");
}

function initials(email?: string): string {
  if (!email) return "?";
  return email[0]!.toUpperCase();
}
</script>

<template>
  <div class="min-h-screen bg-stone-50 text-stone-900 pb-16 md:pb-0 md:flex">
    <!-- Desktop sidebar -->
    <aside class="hidden md:flex md:w-60 md:flex-col md:border-r md:border-stone-200/80 md:bg-white md:px-4 md:py-6">
      <div class="mb-8 flex items-center justify-between px-2">
        <span class="text-lg font-semibold tracking-tight">Execute</span>
        <div class="flex items-center gap-1">
          <router-link to="/assistant" class="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900" title="Assistant">
            <Icon name="sparkles" :size="17" />
          </router-link>
          <router-link to="/search" class="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900" title="Search">
            <Icon name="search" :size="17" />
          </router-link>
        </div>
      </div>
      <nav class="flex flex-col gap-0.5">
        <router-link
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          :class="route.path.startsWith(link.to) ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'"
        >
          <Icon :name="link.icon" :size="17" />
          {{ link.label }}
        </router-link>
      </nav>
      <div class="mt-auto flex items-center gap-2.5 border-t border-stone-100 px-2 pt-4">
        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold text-stone-600">
          {{ initials(auth.user?.email) }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs text-stone-500">{{ auth.user?.email }}</p>
          <button class="flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-stone-900" @click="handleLogout">
            <Icon name="logout" :size="12" /> Log out
          </button>
        </div>
      </div>
    </aside>

    <!-- Mobile header -->
    <header class="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200/80 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
      <span class="text-base font-semibold tracking-tight">Execute</span>
      <div class="flex items-center gap-1">
        <router-link to="/assistant" class="rounded-lg p-1.5 text-stone-400" title="Assistant">
          <Icon name="sparkles" :size="19" />
        </router-link>
        <router-link to="/search" class="rounded-lg p-1.5 text-stone-400" title="Search">
          <Icon name="search" :size="19" />
        </router-link>
      </div>
    </header>

    <main class="flex-1 px-4 py-6 md:px-8 md:py-8">
      <div class="mx-auto max-w-3xl">
        <slot />
      </div>
    </main>

    <!-- Mobile bottom nav -->
    <nav class="fixed inset-x-0 bottom-0 z-10 flex border-t border-stone-200/80 bg-white/95 backdrop-blur md:hidden">
      <router-link
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium"
        :class="route.path.startsWith(link.to) ? 'text-stone-900' : 'text-stone-400'"
      >
        <Icon :name="link.icon" :size="19" />
        {{ link.label }}
      </router-link>
    </nav>
  </div>
</template>
