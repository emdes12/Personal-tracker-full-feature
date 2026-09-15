<script setup lang="ts">
import { onMounted, ref } from "vue";
import * as plansApi from "../api/plans";
import type { Plan } from "../types";
import SkeletonCards from "../components/SkeletonCards.vue";
import EmptyState from "../components/EmptyState.vue";
import Icon from "../components/Icon.vue";
import { useToast } from "../composables/useToast";

const toast = useToast();

const plans = ref<Plan[]>([]);
const loading = ref(true);
const showAddForm = ref(false);
const newName = ref("");
const newType = ref("yearly");
const adding = ref(false);

const PLAN_TYPES = ["yearly", "quarterly", "monthly", "personal", "project", "career", "school", "work", "lifestyle"];

async function load() {
  loading.value = true;
  try {
    plans.value = await plansApi.listPlans().then((r) => r.plans);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function handleAdd() {
  if (!newName.value.trim()) return;
  adding.value = true;
  try {
    await plansApi.createPlan({ name: newName.value.trim(), type: newType.value });
    newName.value = "";
    showAddForm.value = false;
    toast.success("Plan created");
    await load();
  } finally {
    adding.value = false;
  }
}

async function handleDelete(id: string) {
  if (!confirm("Delete this plan? Goals under it will lose their plan link.")) return;
  await plansApi.deletePlan(id);
  toast.info("Plan deleted");
  await load();
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold text-stone-900">Plans</h1>
      <button class="flex items-center gap-1 text-sm font-medium text-stone-900 hover:underline" @click="showAddForm = !showAddForm">
        <Icon :name="showAddForm ? 'close' : 'plus'" :size="14" />
        {{ showAddForm ? "Cancel" : "New plan" }}
      </button>
    </header>

    <form v-if="showAddForm" class="space-y-2 rounded-xl border border-stone-200 bg-white p-4" @submit.prevent="handleAdd">
      <input v-model="newName" type="text" placeholder="e.g. 2026 Plan" required class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
      <select v-model="newType" class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm capitalize">
        <option v-for="type in PLAN_TYPES" :key="type" :value="type">{{ type }}</option>
      </select>
      <button type="submit" :disabled="adding" class="w-full rounded-lg bg-stone-900 py-2 text-sm font-medium text-white disabled:opacity-50">
        {{ adding ? "Creating…" : "Create plan" }}
      </button>
    </form>

    <SkeletonCards v-if="loading" :count="3" height="h-20" />
    <EmptyState v-else-if="!plans.length" icon="layers" message="No plans yet. Goals can also exist without a plan." />
    <div v-else class="space-y-3">
      <div v-for="p in plans" :key="p.id" class="rounded-2xl border border-stone-200 bg-white p-4 transition-colors hover:border-stone-300">
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="text-[11px] font-medium uppercase tracking-wide text-stone-400">{{ p.type }}</span>
            <h3 class="font-medium text-stone-900">{{ p.name }}</h3>
            <p v-if="p.startDate || p.endDate" class="text-xs text-stone-400">{{ p.startDate }} &rarr; {{ p.endDate }}</p>
          </div>
          <button class="flex items-center gap-1 text-xs font-medium text-red-500 hover:underline" @click="handleDelete(p.id)">
            <Icon name="trash" :size="12" /> Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
