<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import * as reviewsApi from "../api/reviews";
import type { DailySummary } from "../types";
import { formatDateLong, addDays } from "../lib/date";
import SkeletonCards from "../components/SkeletonCards.vue";
import Icon from "../components/Icon.vue";
import { useToast } from "../composables/useToast";

const toast = useToast();

const route = useRoute();
const date = ref((route.params.date as string) ?? "");

const summary = ref<DailySummary | null>(null);
const accomplished = ref("");
const blockers = ref("");
const focusTomorrow = ref("");
const loading = ref(true);
const saving = ref(false);
const savedAt = ref<number | null>(null);

async function load() {
  loading.value = true;
  try {
    const res = await reviewsApi.getReview(date.value);
    summary.value = res.summary;
    accomplished.value = res.review?.accomplished ?? "";
    blockers.value = res.review?.blockers ?? "";
    focusTomorrow.value = res.review?.focusTomorrow ?? "";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(() => route.params.date, (d) => {
  date.value = d as string;
  load();
});

async function handleSave() {
  saving.value = true;
  try {
    await reviewsApi.saveReview(date.value, {
      accomplished: accomplished.value || null,
      blockers: blockers.value || null,
      focusTomorrow: focusTomorrow.value || null,
    });
    savedAt.value = Date.now();
    toast.success("Review saved");
  } finally {
    saving.value = false;
  }
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
}
</script>

<template>
  <div v-if="loading" class="space-y-8">
    <div class="h-8 w-48 animate-pulse rounded bg-stone-200" />
    <SkeletonCards :count="2" height="h-20" />
  </div>

  <div v-else-if="summary" class="space-y-8">
    <header class="flex items-center justify-between">
      <div>
        <p class="text-sm text-stone-400">Daily review</p>
        <h1 class="text-2xl font-semibold text-stone-900">{{ formatDateLong(date) }}</h1>
      </div>
      <div class="flex gap-1 text-sm">
        <router-link :to="`/review/${addDays(date, -1)}`" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900">
          <Icon name="chevron-left" :size="16" />
        </router-link>
        <router-link :to="`/review/${addDays(date, 1)}`" class="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900">
          <Icon name="chevron-right" :size="16" />
        </router-link>
      </div>
    </header>

    <section class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl border border-stone-200 bg-white p-3 text-center">
        <p class="text-2xl font-semibold text-emerald-600">{{ summary.completionPercent }}%</p>
        <p class="text-xs text-stone-400">completion</p>
      </div>
      <div class="rounded-xl border border-stone-200 bg-white p-3 text-center">
        <p class="text-2xl font-semibold text-stone-900">{{ summary.tasksCompleted }}</p>
        <p class="text-xs text-stone-400">completed</p>
      </div>
      <div class="rounded-xl border border-stone-200 bg-white p-3 text-center">
        <p class="text-2xl font-semibold text-stone-900">{{ summary.tasksIncomplete }}</p>
        <p class="text-xs text-stone-400">incomplete</p>
      </div>
      <div class="rounded-xl border border-stone-200 bg-white p-3 text-center">
        <p class="text-2xl font-semibold text-stone-900">{{ summary.tasksCarriedOver }}</p>
        <p class="text-xs text-stone-400">carried over</p>
      </div>
    </section>

    <section class="grid grid-cols-2 gap-3 sm:grid-cols-2">
      <div class="rounded-xl border border-stone-200 bg-white p-3">
        <p class="text-xs text-stone-400">Focus time</p>
        <p class="font-medium text-stone-900">{{ formatMinutes(summary.focusMinutes) }}</p>
      </div>
      <div class="rounded-xl border border-stone-200 bg-white p-3">
        <p class="text-xs text-stone-400">Sleep</p>
        <p class="font-medium text-stone-900">{{ summary.sleep ? formatMinutes(summary.sleep.durationMinutes) : "Not logged" }}</p>
      </div>
    </section>

    <section v-if="summary.goalsWorkedOn.length">
      <h2 class="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Goals worked on</h2>
      <div class="flex flex-wrap gap-2">
        <router-link
          v-for="g in summary.goalsWorkedOn"
          :key="g.id"
          :to="`/goals/${g.id}`"
          class="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700 hover:border-stone-400"
        >
          {{ g.title }}
        </router-link>
      </div>
    </section>

    <form class="space-y-4" @submit.prevent="handleSave">
      <div>
        <label class="mb-1 block text-sm font-medium text-stone-700">What did I accomplish today?</label>
        <textarea v-model="accomplished" rows="3" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-stone-700">What blocked me?</label>
        <textarea v-model="blockers" rows="3" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-stone-700">What should I focus on tomorrow?</label>
        <textarea v-model="focusTomorrow" rows="3" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none" />
      </div>
      <div class="flex items-center gap-3">
        <button type="submit" :disabled="saving" class="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {{ saving ? "Saving…" : "Save review" }}
        </button>
        <span v-if="savedAt" class="flex items-center gap-1 text-xs text-emerald-600"><Icon name="check" :size="12" /> Saved</span>
      </div>
    </form>
  </div>
</template>
