<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import * as todayApi from "../api/today";
import * as tasksApi from "../api/tasks";
import * as goalsApi from "../api/goals";
import * as streaksApi from "../api/streaks";
import type { Goal, TodayResponse } from "../types";
import { todayDateString, formatDateLong, formatTime } from "../lib/date";
import TaskRow from "../components/TaskRow.vue";
import ProgressBar from "../components/ProgressBar.vue";
import SleepWidget from "../components/SleepWidget.vue";
import SkeletonCards from "../components/SkeletonCards.vue";
import EmptyState from "../components/EmptyState.vue";
import Icon from "../components/Icon.vue";
import { useToast } from "../composables/useToast";

const toast = useToast();

const date = todayDateString();
const view = ref<TodayResponse | null>(null);
const goals = ref<Goal[]>([]);
const streak = ref(0);
const loading = ref(true);

const showAddForm = ref(false);
const newTitle = ref("");
const newStartTime = ref("");
const newEndTime = ref("");
const newGoalId = ref("");
const isRecurring = ref(false);
const recurrenceType = ref<"daily" | "weekdays" | "weekly" | "monthly">("daily");
const adding = ref(false);

async function load() {
  // Only show the skeleton on the very first load. Reloads triggered by a
  // child action (completing a task, starting a focus session, ...) must
  // NOT flip `loading` back to true — that swaps the template's v-if/
  // v-else-if branch, which unmounts every TaskRow and discards their local
  // state (in-flight Pomodoro countdowns, open menus) even though nothing
  // about the list structure actually needs to change.
  const isFirstLoad = view.value === null;
  if (isFirstLoad) loading.value = true;
  try {
    const [t, g, s] = await Promise.all([todayApi.getToday(date), goalsApi.listGoals(), streaksApi.getStreak()]);
    view.value = t;
    goals.value = g.goals.filter((goal) => goal.status === "active");
    streak.value = s.streak;
  } finally {
    if (isFirstLoad) loading.value = false;
  }
}

onMounted(load);

const todayTasks = computed(() => view.value?.today ?? []);

async function handleAddTask() {
  if (!newTitle.value.trim()) return;
  adding.value = true;
  try {
    if (isRecurring.value) {
      await tasksApi.createRecurringTask({
        title: newTitle.value.trim(),
        goalId: newGoalId.value || null,
        recurrenceType: recurrenceType.value,
        recurrenceStartDate: date,
        startTime: newStartTime.value || null,
        endTime: newEndTime.value || null,
      });
    } else {
      await tasksApi.createTask({
        title: newTitle.value.trim(),
        scheduledDate: date,
        startTime: newStartTime.value || null,
        endTime: newEndTime.value || null,
        goalId: newGoalId.value || null,
      });
    }
    newTitle.value = "";
    newStartTime.value = "";
    newEndTime.value = "";
    newGoalId.value = "";
    isRecurring.value = false;
    showAddForm.value = false;
    toast.success("Task added");
    await load();
  } finally {
    adding.value = false;
  }
}
</script>

<template>
  <div v-if="loading" class="space-y-8">
    <div class="space-y-2">
      <div class="h-4 w-32 animate-pulse rounded bg-stone-200" />
      <div class="h-8 w-40 animate-pulse rounded bg-stone-200" />
    </div>
    <SkeletonCards :count="4" height="h-20" />
  </div>

  <div v-else-if="view" class="space-y-8">
    <header>
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm text-stone-400">{{ formatDateLong(date) }}</p>
          <div class="mt-1 flex items-baseline gap-3">
            <h1 class="text-3xl font-semibold text-stone-900">Today</h1>
            <span class="text-lg font-medium text-emerald-600">{{ view.completion.percent }}%</span>
          </div>
          <p class="text-sm text-stone-400">{{ view.completion.completed }} / {{ view.completion.total }} completed</p>
        </div>
        <div v-if="streak > 0" class="flex shrink-0 items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5">
          <Icon name="flame" :size="16" class="text-orange-500" />
          <div>
            <p class="text-sm font-semibold leading-none text-orange-600">{{ streak }}</p>
            <p class="text-[10px] leading-none text-orange-400">day streak</p>
          </div>
        </div>
      </div>
      <div class="mt-3 max-w-xs">
        <ProgressBar :percent="view.completion.percent" />
      </div>
    </header>

    <section class="grid gap-4 sm:grid-cols-3">
      <div v-if="view.now" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Now</p>
        <p class="font-medium text-stone-900">{{ view.now.title }}</p>
        <p class="text-sm text-stone-500">{{ formatTime(view.now.startAt) }} – {{ formatTime(view.now.endAt) }}</p>
      </div>
      <div v-if="view.upNext" class="rounded-2xl border border-stone-200 bg-white p-4">
        <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">Up next</p>
        <p class="font-medium text-stone-900">{{ view.upNext.title }}</p>
        <p class="text-sm text-stone-500">{{ formatTime(view.upNext.startAt) }}</p>
      </div>
      <SleepWidget :date="date" />
    </section>

    <section v-if="view.carriedOver.length">
      <h2 class="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-700">Carried over from before</h2>
      <div class="space-y-2">
        <TaskRow v-for="o in view.carriedOver" :key="o.id" :occurrence="o" carried-over @changed="load" />
      </div>
    </section>

    <section>
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-stone-500">Today's tasks</h2>
        <button class="flex items-center gap-1 text-sm font-medium text-stone-900 hover:underline" @click="showAddForm = !showAddForm">
          <Icon :name="showAddForm ? 'close' : 'plus'" :size="14" />
          {{ showAddForm ? "Cancel" : "Add task" }}
        </button>
      </div>

      <form v-if="showAddForm" class="mb-4 space-y-2 rounded-xl border border-stone-200 bg-white p-3" @submit.prevent="handleAddTask">
        <input v-model="newTitle" type="text" placeholder="What do you need to do?" required class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none" />
        <div class="flex gap-2">
          <input v-model="newStartTime" type="time" class="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          <input v-model="newEndTime" type="time" class="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <select v-model="newGoalId" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
          <option value="">No goal</option>
          <option v-for="g in goals" :key="g.id" :value="g.id">{{ g.title }}</option>
        </select>
        <label class="flex items-center gap-2 text-sm text-stone-600">
          <input v-model="isRecurring" type="checkbox" class="rounded border-stone-300" />
          Repeats
        </label>
        <select v-if="isRecurring" v-model="recurrenceType" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
          <option value="daily">Every day</option>
          <option value="weekdays">Weekdays</option>
          <option value="weekly">Weekly (same day)</option>
          <option value="monthly">Monthly (same date)</option>
        </select>
        <p v-if="!isRecurring && (newStartTime || newEndTime)" class="text-xs text-stone-500">
          You'll get an alarm reminder automatically when this task starts and ends.
        </p>
        <button type="submit" :disabled="adding" class="w-full rounded-lg bg-stone-900 py-2 text-sm font-medium text-white disabled:opacity-50">
          {{ adding ? "Adding…" : "Add task" }}
        </button>
      </form>

      <div v-if="todayTasks.length" class="space-y-2">
        <TaskRow v-for="o in todayTasks" :key="o.id" :occurrence="o" @changed="load" />
      </div>
      <EmptyState v-else icon="sun" message="Nothing scheduled today yet." />
    </section>

    <section class="border-t border-stone-100 pt-4 text-center">
      <router-link :to="`/review/${date}`" class="inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900 hover:underline">
        Review today <Icon name="chevron-right" :size="14" />
      </router-link>
    </section>
  </div>
</template>
