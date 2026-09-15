<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as goalsApi from "../api/goals";
import * as targetsApi from "../api/targets";
import * as tasksApi from "../api/tasks";
import * as streaksApi from "../api/streaks";
import type { Goal, Target } from "../types";
import ProgressBar from "../components/ProgressBar.vue";
import SkeletonCards from "../components/SkeletonCards.vue";
import EmptyState from "../components/EmptyState.vue";
import Icon from "../components/Icon.vue";
import { useToast } from "../composables/useToast";

const toast = useToast();

const route = useRoute();
const router = useRouter();
const goalId = route.params.id as string;

const goal = ref<Goal | null>(null);
const targets = ref<Target[]>([]);
const streak = ref(0);
const loading = ref(true);

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

function formatFocusedHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

const showAddTarget = ref(false);
const newTargetTitle = ref("");
const newTargetType = ref("milestone");
const addingTarget = ref(false);

const addingTaskFor = ref<string | null>(null);
const newTaskTitle = ref("");

async function load() {
  loading.value = true;
  try {
    const [res, s] = await Promise.all([goalsApi.getGoal(goalId), streaksApi.getStreak(goalId)]);
    goal.value = res.goal;
    targets.value = res.targets;
    streak.value = s.streak;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function handleAddTarget() {
  if (!newTargetTitle.value.trim()) return;
  addingTarget.value = true;
  try {
    await targetsApi.createTarget({ goalId, title: newTargetTitle.value.trim(), type: newTargetType.value });
    newTargetTitle.value = "";
    showAddTarget.value = false;
    toast.success("Target added");
    await load();
  } finally {
    addingTarget.value = false;
  }
}

async function handleAddTask(targetId: string) {
  if (!newTaskTitle.value.trim()) return;
  const today = new Date();
  const scheduledDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  await tasksApi.createTask({ title: newTaskTitle.value.trim(), goalId, targetId, scheduledDate });
  newTaskTitle.value = "";
  addingTaskFor.value = null;
  toast.success("Task added");
  await load();
}

async function handleDeleteGoal() {
  if (!confirm("Delete this goal? Targets and tasks under it will lose their goal link.")) return;
  await goalsApi.deleteGoal(goalId);
  router.push("/goals");
}
</script>

<template>
  <div v-if="loading" class="space-y-8">
    <div class="h-4 w-20 animate-pulse rounded bg-stone-200" />
    <SkeletonCards :count="2" height="h-24" />
  </div>

  <div v-else-if="goal" class="space-y-8">
    <header>
      <router-link to="/goals" class="inline-flex items-center gap-1 text-sm text-stone-400 hover:underline">
        <Icon name="chevron-left" :size="14" /> Goals
      </router-link>
      <div class="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold text-stone-900">{{ goal.title }}</h1>
          <p v-if="goal.description" class="mt-1 text-sm text-stone-500">{{ goal.description }}</p>
        </div>
        <span class="shrink-0 text-3xl font-semibold text-stone-900">{{ goal.progress.percent }}%</span>
      </div>
      <div class="mt-3 max-w-md">
        <ProgressBar :percent="goal.progress.percent" />
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-stone-500">
        <span v-if="goal.deadline">Deadline: {{ goal.deadline }}</span>
        <span v-if="goal.daysRemaining !== null">{{ goal.daysRemaining >= 0 ? `${goal.daysRemaining} days left` : "Past deadline" }}</span>
        <span v-if="healthLabel[goal.health]" :class="healthColor[goal.health]" class="font-medium">{{ healthLabel[goal.health] }}</span>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-xl border border-stone-200 bg-white p-3">
          <p class="text-lg font-semibold text-stone-900">{{ goal.progress.completed }}</p>
          <p class="text-xs text-stone-400">tasks completed</p>
        </div>
        <div v-if="goal.activity" class="rounded-xl border border-stone-200 bg-white p-3">
          <p class="text-lg font-semibold text-stone-900">{{ formatFocusedHours(goal.activity.focusedMinutes) }}</p>
          <p class="text-xs text-stone-400">focused hours</p>
        </div>
        <div v-if="goal.activity" class="rounded-xl border border-stone-200 bg-white p-3">
          <p class="text-lg font-semibold text-stone-900">{{ goal.activity.daysActive }}</p>
          <p class="text-xs text-stone-400">days active</p>
        </div>
        <div v-if="streak > 0" class="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white p-3">
          <Icon name="flame" :size="16" class="text-orange-500" />
          <div>
            <p class="text-lg font-semibold leading-none text-stone-900">{{ streak }}</p>
            <p class="text-xs text-stone-400">day streak</p>
          </div>
        </div>
      </div>

      <button class="mt-3 flex items-center gap-1 text-xs font-medium text-red-500 hover:underline" @click="handleDeleteGoal">
        <Icon name="trash" :size="12" /> Delete goal
      </button>
    </header>

    <section>
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-stone-500">Targets</h2>
        <button class="flex items-center gap-1 text-sm font-medium text-stone-900 hover:underline" @click="showAddTarget = !showAddTarget">
          <Icon :name="showAddTarget ? 'close' : 'plus'" :size="14" />
          {{ showAddTarget ? "Cancel" : "Add target" }}
        </button>
      </div>

      <form v-if="showAddTarget" class="mb-4 space-y-2 rounded-xl border border-stone-200 bg-white p-3" @submit.prevent="handleAddTarget">
        <input v-model="newTargetTitle" type="text" placeholder="e.g. Complete inventory module" required class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <select v-model="newTargetType" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
          <option value="milestone">Milestone</option>
          <option value="monthly">Monthly target</option>
          <option value="weekly">Weekly target</option>
          <option value="custom">Custom</option>
        </select>
        <button type="submit" :disabled="addingTarget" class="w-full rounded-lg bg-stone-900 py-2 text-sm font-medium text-white disabled:opacity-50">Add target</button>
      </form>

      <EmptyState v-if="!targets.length" icon="layers" message="No targets yet — break this goal down into milestones." />
      <div v-else class="space-y-3">
        <div v-for="t in targets" :key="t.id" class="rounded-2xl border border-stone-200 bg-white p-4">
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="text-[11px] font-medium uppercase tracking-wide text-stone-400">{{ t.type }}</span>
              <h3 class="font-medium text-stone-900">{{ t.title }}</h3>
            </div>
            <span class="shrink-0 font-semibold text-stone-900">{{ t.progress.percent }}%</span>
          </div>
          <ProgressBar :percent="t.progress.percent" size="sm" />
          <p class="mt-1 text-xs text-stone-400">{{ t.progress.completed }} / {{ t.progress.total }} tasks</p>

          <button v-if="addingTaskFor !== t.id" class="mt-2 text-xs font-medium text-stone-600 hover:underline" @click="addingTaskFor = t.id">+ Add task</button>
          <form v-else class="mt-2 flex gap-2" @submit.prevent="handleAddTask(t.id)">
            <input v-model="newTaskTitle" type="text" placeholder="Task title" required class="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
            <button type="submit" class="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white">Add</button>
          </form>

          <div v-if="t.children?.length" class="mt-3 space-y-2 border-l-2 border-stone-100 pl-3">
            <div v-for="child in t.children" :key="child.id" class="rounded-xl border border-stone-100 bg-stone-50 p-3">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <span class="text-[11px] font-medium uppercase tracking-wide text-stone-400">{{ child.type }}</span>
                  <p class="text-sm font-medium text-stone-900">{{ child.title }}</p>
                </div>
                <span class="text-sm font-semibold text-stone-900">{{ child.progress.percent }}%</span>
              </div>
              <ProgressBar :percent="child.progress.percent" size="sm" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
