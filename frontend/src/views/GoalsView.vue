<script setup lang="ts">
import { onMounted, ref } from "vue";
import * as goalsApi from "../api/goals";
import type { Goal } from "../types";
import ProgressBar from "../components/ProgressBar.vue";
import SkeletonCards from "../components/SkeletonCards.vue";
import EmptyState from "../components/EmptyState.vue";
import Icon from "../components/Icon.vue";
import { useToast } from "../composables/useToast";

const toast = useToast();

const goals = ref<Goal[]>([]);
const loading = ref(true);
const showAddForm = ref(false);
const newTitle = ref("");
const newDeadline = ref("");
const newPriority = ref("medium");
const adding = ref(false);

const healthLabel: Record<string, string> = {
  on_track: "On track",
  at_risk: "At risk",
  behind: "Behind",
  completed: "Completed",
  no_deadline: "",
};

const healthColor: Record<string, string> = {
  on_track: "text-emerald-600",
  at_risk: "text-amber-600",
  behind: "text-red-600",
  completed: "text-stone-400",
  no_deadline: "text-stone-400",
};

async function load() {
  loading.value = true;
  try {
    goals.value = await goalsApi.listGoals().then((r) => r.goals);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function handleAdd() {
  if (!newTitle.value.trim()) return;
  adding.value = true;
  try {
    await goalsApi.createGoal({
      title: newTitle.value.trim(),
      deadline: newDeadline.value || null,
      priority: newPriority.value,
    });
    newTitle.value = "";
    newDeadline.value = "";
    newPriority.value = "medium";
    showAddForm.value = false;
    toast.success("Goal created");
    await load();
  } finally {
    adding.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-stone-900">Goals</h1>
      <button class="flex items-center gap-1 text-sm font-medium text-stone-900 hover:underline" @click="showAddForm = !showAddForm">
        <Icon :name="showAddForm ? 'close' : 'plus'" :size="14" />
        {{ showAddForm ? "Cancel" : "New goal" }}
      </button>
    </header>

    <form v-if="showAddForm" class="space-y-2 rounded-xl border border-stone-200 bg-white p-4" @submit.prevent="handleAdd">
      <input v-model="newTitle" type="text" placeholder="e.g. Launch StockỌja" required class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none" />
      <div class="flex gap-2">
        <input v-model="newDeadline" type="date" class="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <select v-model="newPriority" class="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <button type="submit" :disabled="adding" class="w-full rounded-lg bg-stone-900 py-2 text-sm font-medium text-white disabled:opacity-50">
        {{ adding ? "Creating…" : "Create goal" }}
      </button>
    </form>

    <SkeletonCards v-if="loading" :count="3" height="h-24" />
    <EmptyState v-else-if="!goals.length" icon="target" message="No goals yet. Start by adding one above." />
    <div v-else class="space-y-3">
      <router-link
        v-for="g in goals"
        :key="g.id"
        :to="`/goals/${g.id}`"
        class="block rounded-2xl border border-stone-200 bg-white p-4 transition-all hover:border-stone-300 hover:shadow-sm"
      >
        <div class="mb-1 flex items-start justify-between gap-2">
          <h3 class="font-medium text-stone-900">{{ g.title }}</h3>
          <span class="shrink-0 text-lg font-semibold text-stone-900">{{ g.progress.percent }}%</span>
        </div>
        <ProgressBar :percent="g.progress.percent" size="sm" />
        <div class="mt-2 flex items-center justify-between text-xs text-stone-400">
          <span v-if="g.deadline">Deadline {{ g.deadline }}</span>
          <span v-else />
          <span :class="healthColor[g.health]" class="font-medium">{{ healthLabel[g.health] }}</span>
        </div>
      </router-link>
    </div>
  </div>
</template>
