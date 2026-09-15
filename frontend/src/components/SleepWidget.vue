<script setup lang="ts">
import { onMounted, ref } from "vue";
import * as sleepApi from "../api/sleep";
import type { SleepRecord } from "../types";
import { addDays } from "../lib/date";
import { useAuthStore } from "../stores/auth";
import Icon from "./Icon.vue";
import { useToast } from "../composables/useToast";

const toast = useToast();

const props = defineProps<{ date: string }>();
const auth = useAuthStore();

const record = ref<SleepRecord | null>(null);
const loading = ref(true);
const showForm = ref(false);
const sleepTime = ref("23:00");
const wakeTime = ref("07:00");
const quality = ref<string>("");
const saving = ref(false);

async function load() {
  loading.value = true;
  try {
    const res = await sleepApi.getSleepForDate(props.date);
    record.value = res.record;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

async function handleSave() {
  saving.value = true;
  try {
    const sleepDate = addDays(props.date, -1);
    await sleepApi.createSleep({
      sleepDate,
      sleepTime: sleepTime.value,
      wakeDate: props.date,
      wakeTime: wakeTime.value,
      quality: quality.value || null,
    });
    showForm.value = false;
    toast.success("Sleep logged");
    await load();
  } finally {
    saving.value = false;
  }
}

const sleepGoalMinutes = () => auth.user?.sleepGoalMinutes ?? 450;
</script>

<template>
  <div class="rounded-2xl border border-stone-200 bg-white p-4">
    <p class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
      <Icon name="moon" :size="13" /> Sleep
    </p>

    <div v-if="loading" class="h-10 w-24 animate-pulse rounded bg-stone-100" />

    <div v-else-if="record && !showForm">
      <p class="text-2xl font-semibold text-stone-900">{{ formatDuration(record.durationMinutes) }}</p>
      <p class="text-xs text-stone-400">Target: {{ formatDuration(sleepGoalMinutes()) }}</p>
      <button class="mt-2 flex items-center gap-1 text-xs font-medium text-stone-500 hover:underline" @click="showForm = true">
        <Icon name="pencil" :size="11" /> Edit
      </button>
    </div>

    <div v-else-if="!showForm">
      <p class="mb-2 text-sm text-stone-400">Not logged yet.</p>
      <button class="flex items-center gap-1 text-sm font-medium text-stone-900 hover:underline" @click="showForm = true">
        <Icon name="plus" :size="13" /> Log sleep
      </button>
    </div>

    <form v-if="showForm" class="space-y-2" @submit.prevent="handleSave">
      <div class="flex items-center gap-2">
        <label class="w-16 text-xs text-stone-500">Slept</label>
        <input v-model="sleepTime" type="time" class="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
      </div>
      <div class="flex items-center gap-2">
        <label class="w-16 text-xs text-stone-500">Woke</label>
        <input v-model="wakeTime" type="time" class="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
      </div>
      <select v-model="quality" class="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm">
        <option value="">Quality (optional)</option>
        <option value="poor">Poor</option>
        <option value="fair">Fair</option>
        <option value="good">Good</option>
        <option value="excellent">Excellent</option>
      </select>
      <div class="flex gap-2">
        <button type="submit" :disabled="saving" class="flex-1 rounded-lg bg-stone-900 py-1.5 text-xs font-medium text-white disabled:opacity-50">Save</button>
        <button type="button" class="rounded-lg border border-stone-300 px-3 py-1.5 text-xs" @click="showForm = false">Cancel</button>
      </div>
    </form>
  </div>
</template>
