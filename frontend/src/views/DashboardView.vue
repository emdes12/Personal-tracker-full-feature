<script setup lang="ts">
import { onMounted, ref } from "vue";
import * as analyticsApi from "../api/analytics";
import type { DashboardStats, LifetimeStats } from "../types";
import ProgressBar from "../components/ProgressBar.vue";
import SkeletonCards from "../components/SkeletonCards.vue";
import Icon from "../components/Icon.vue";

const stats = ref<DashboardStats | null>(null);
const lifetime = ref<LifetimeStats | null>(null);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const [d, l] = await Promise.all([analyticsApi.getDashboardStats(), analyticsApi.getLifetimeStats()]);
    stats.value = d;
    lifetime.value = l;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function formatSleep(minutes: number | null): string {
  if (minutes === null) return "No data";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}
</script>

<template>
  <div class="space-y-8">
    <header>
      <h1 class="text-2xl font-semibold text-stone-900">Dashboard</h1>
      <p class="text-sm text-stone-400">The bigger picture, beyond today.</p>
    </header>

    <SkeletonCards v-if="loading" :count="3" height="h-24" />

    <template v-else-if="stats && lifetime">
      <section class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div class="rounded-2xl border border-stone-200 bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-stone-400">This week</p>
          <p class="text-2xl font-semibold text-stone-900">{{ stats.thisWeek.percent }}%</p>
          <p class="text-xs text-stone-400">{{ stats.thisWeek.completed }} / {{ stats.thisWeek.total }} completed</p>
        </div>
        <div class="rounded-2xl border border-stone-200 bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-stone-400">{{ stats.monthLabel }}</p>
          <p class="text-2xl font-semibold text-stone-900">{{ stats.thisMonth.percent }}%</p>
          <p class="text-xs text-stone-400">{{ stats.thisMonth.completed }} / {{ stats.thisMonth.total }} completed</p>
        </div>
        <div class="rounded-2xl border border-stone-200 bg-white p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-stone-400">Sleep (7-day avg)</p>
          <p class="text-2xl font-semibold text-stone-900">{{ formatSleep(stats.sleepAvgMinutes) }}</p>
        </div>
      </section>

      <section class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-xl border border-stone-200 bg-white p-3 text-center">
          <p class="text-xl font-semibold text-stone-900">{{ lifetime.tasksCompleted }}</p>
          <p class="text-xs text-stone-400">tasks completed (all time)</p>
        </div>
        <div class="rounded-xl border border-stone-200 bg-white p-3 text-center">
          <p class="text-xl font-semibold text-stone-900">{{ formatHours(lifetime.focusedMinutes) }}</p>
          <p class="text-xs text-stone-400">focused hours (all time)</p>
        </div>
        <div class="rounded-xl border border-stone-200 bg-white p-3 text-center">
          <p class="flex items-center justify-center gap-1 text-xl font-semibold text-stone-900">
            {{ stats.currentStreak }}<Icon name="flame" :size="16" class="text-orange-500" />
          </p>
          <p class="text-xs text-stone-400">current streak</p>
        </div>
        <div class="rounded-xl border border-stone-200 bg-white p-3 text-center">
          <p class="text-xl font-semibold text-stone-900">{{ stats.longestStreak }}</p>
          <p class="text-xs text-stone-400">longest streak</p>
        </div>
      </section>

      <section v-if="stats.goals.length">
        <h2 class="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Goal progress</h2>
        <div class="space-y-3">
          <router-link
            v-for="g in stats.goals"
            :key="g.id"
            :to="`/goals/${g.id}`"
            class="block rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-300"
          >
            <div class="mb-1 flex items-center justify-between text-sm">
              <span class="font-medium text-stone-900">{{ g.title }}</span>
              <span class="text-stone-500">{{ g.percent }}%</span>
            </div>
            <ProgressBar :percent="g.percent" size="sm" />
          </router-link>
        </div>
      </section>
      <p v-else class="text-sm text-stone-400">No active goals yet.</p>
    </template>
  </div>
</template>
