<script setup lang="ts">
import { onMounted, ref } from "vue";
import * as historyApi from "../api/history";
import type { DayHistorySummary } from "../types";
import { todayDateString, addDays, formatDateLong } from "../lib/date";
import ProgressBar from "../components/ProgressBar.vue";
import SkeletonCards from "../components/SkeletonCards.vue";
import EmptyState from "../components/EmptyState.vue";

const today = todayDateString();
const from = ref(addDays(today, -29));
const to = ref(today);
const days = ref<DayHistorySummary[]>([]);
const loading = ref(true);
const activePreset = ref<"today" | "week" | "month">("month");

async function load() {
  loading.value = true;
  try {
    const res = await historyApi.getHistoryRange(from.value, to.value);
    days.value = res.days;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function setPreset(preset: "today" | "week" | "month") {
  activePreset.value = preset;
  if (preset === "today") {
    from.value = today;
    to.value = today;
  } else if (preset === "week") {
    from.value = addDays(today, -6);
    to.value = today;
  } else {
    from.value = addDays(today, -29);
    to.value = today;
  }
  load();
}

function formatMinutes(m: number | null): string {
  if (m === null) return "—";
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm}m`;
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-2xl font-semibold text-stone-900">History</h1>
      <p class="text-sm text-stone-400">What have you actually been doing?</p>
    </header>

    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="p in (['today', 'week', 'month'] as const)"
        :key="p"
        class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
        :class="activePreset === p ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-400'"
        @click="setPreset(p)"
      >
        {{ p === "today" ? "Today" : p === "week" ? "This week" : "Last 30 days" }}
      </button>
      <input v-model="from" type="date" class="rounded-lg border border-stone-300 px-2 py-1 text-xs" @change="load" />
      <span class="text-xs text-stone-400">to</span>
      <input v-model="to" type="date" class="rounded-lg border border-stone-300 px-2 py-1 text-xs" @change="load" />
    </div>

    <SkeletonCards v-if="loading" :count="5" height="h-16" />
    <EmptyState v-else-if="!days.length" icon="history" message="No activity recorded in this range yet." />
    <div v-else class="space-y-2">
      <router-link
        v-for="d in days"
        :key="d.date"
        :to="`/review/${d.date}`"
        class="block rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-300"
      >
        <div class="flex items-center gap-4">
          <div class="w-32 shrink-0">
            <p class="text-sm font-medium text-stone-900">{{ formatDateLong(d.date) }}</p>
          </div>
          <div class="flex-1">
            <ProgressBar :percent="d.completionPercent" size="sm" />
          </div>
          <div class="w-20 shrink-0 text-right text-sm text-stone-500">{{ d.tasksCompleted }}/{{ d.tasksTotal }}</div>
          <div class="w-16 shrink-0 text-right text-xs text-stone-400">{{ formatMinutes(d.sleepMinutes) }}</div>
        </div>
        <div v-if="d.goalsWorkedOn.length" class="mt-2 flex flex-wrap gap-1.5 pl-[7.5rem]">
          <span v-for="g in d.goalsWorkedOn" :key="g.id" class="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">{{ g.title }}</span>
        </div>
      </router-link>
    </div>
  </div>
</template>
