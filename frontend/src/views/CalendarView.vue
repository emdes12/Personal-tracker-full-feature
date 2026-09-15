<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import * as tasksApi from "../api/tasks";
import type { TaskOccurrence } from "../types";
import { addDays, todayDateString } from "../lib/date";
import TaskRow from "../components/TaskRow.vue";
import SkeletonCards from "../components/SkeletonCards.vue";
import Icon from "../components/Icon.vue";

const today = todayDateString();
const anchor = ref(today);
const occurrences = ref<TaskOccurrence[]>([]);
const loading = ref(true);

function startOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay(); // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow; // Monday as start
  date.setDate(date.getDate() + diff);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const weekStart = computed(() => startOfWeek(anchor.value));
const weekDays = computed(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart.value, i)));
const weekLabel = computed(() => {
  const start = weekDays.value[0];
  const end = weekDays.value[6];
  return `${dayLabel(start, false)} – ${dayLabel(end, false)}`;
});

async function load() {
  loading.value = true;
  try {
    const res = await tasksApi.listOccurrencesInRange(weekStart.value, addDays(weekStart.value, 6));
    occurrences.value = res.occurrences;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function occurrencesForDay(date: string): TaskOccurrence[] {
  return occurrences.value.filter((o) => o.scheduledDate === date);
}

function dayLabel(date: string, withWeekday = true): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, withWeekday ? { weekday: "short", month: "short", day: "numeric" } : { month: "short", day: "numeric" });
}

function prevWeek() {
  anchor.value = addDays(weekStart.value, -7);
  load();
}
function nextWeek() {
  anchor.value = addDays(weekStart.value, 7);
  load();
}
function thisWeek() {
  anchor.value = today;
  load();
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-stone-900">Calendar</h1>
        <p class="text-sm text-stone-400">{{ weekLabel }}</p>
      </div>
      <div class="flex items-center gap-1.5 text-sm">
        <button class="rounded-lg border border-stone-300 p-1.5 text-stone-500 hover:bg-stone-100" @click="prevWeek">
          <Icon name="chevron-left" :size="15" />
        </button>
        <button class="rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100" @click="thisWeek">This week</button>
        <button class="rounded-lg border border-stone-300 p-1.5 text-stone-500 hover:bg-stone-100" @click="nextWeek">
          <Icon name="chevron-right" :size="15" />
        </button>
      </div>
    </header>

    <SkeletonCards v-if="loading" :count="7" height="h-14" />
    <div v-else class="space-y-5">
      <div v-for="day in weekDays" :key="day">
        <h2 class="mb-2 flex items-center gap-2 text-sm font-semibold" :class="day === today ? 'text-emerald-600' : 'text-stone-500'">
          {{ dayLabel(day) }}
          <span v-if="day === today" class="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">today</span>
        </h2>
        <div v-if="occurrencesForDay(day).length" class="space-y-2">
          <TaskRow v-for="o in occurrencesForDay(day)" :key="o.id" :occurrence="o" @changed="load" />
        </div>
        <p v-else class="pl-1 text-xs text-stone-300">Nothing scheduled</p>
      </div>
    </div>
  </div>
</template>
