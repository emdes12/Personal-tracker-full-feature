<script setup lang="ts">
import { ref } from "vue";
import * as searchApi from "../api/search";
import type { SearchResults } from "../types";
import Icon from "../components/Icon.vue";
import EmptyState from "../components/EmptyState.vue";

const query = ref("");
const results = ref<SearchResults | null>(null);
const loading = ref(false);
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function onInput() {
  clearTimeout(debounceTimer);
  if (!query.value.trim()) {
    results.value = null;
    return;
  }
  debounceTimer = setTimeout(runSearch, 300);
}

async function runSearch() {
  if (!query.value.trim()) return;
  loading.value = true;
  try {
    results.value = await searchApi.search(query.value.trim());
  } finally {
    loading.value = false;
  }
}

const hasResults = () =>
  results.value &&
  (results.value.goals.length ||
    results.value.plans.length ||
    results.value.targets.length ||
    results.value.tasks.length ||
    results.value.notes.length ||
    results.value.reviews.length);
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="mb-3 text-2xl font-semibold text-stone-900">Search</h1>
      <div class="relative">
        <Icon name="search" :size="16" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          v-model="query"
          type="text"
          placeholder="Search tasks, goals, plans, notes…"
          class="w-full rounded-lg border border-stone-300 py-2.5 pl-10 pr-4 text-sm focus:border-stone-500 focus:outline-none"
          autofocus
          @input="onInput"
        />
      </div>
    </header>

    <div v-if="loading" class="py-8 text-center text-sm text-stone-400">Searching…</div>

    <div v-else-if="results" class="space-y-6">
      <section v-if="results.goals.length">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Goals</h2>
        <div class="space-y-1">
          <router-link v-for="g in results.goals" :key="g.id" :to="`/goals/${g.id}`" class="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100">{{ g.title }}</router-link>
        </div>
      </section>

      <section v-if="results.plans.length">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Plans</h2>
        <div class="space-y-1">
          <router-link v-for="p in results.plans" :key="p.id" to="/plans" class="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100">{{ p.name }}</router-link>
        </div>
      </section>

      <section v-if="results.targets.length">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Targets</h2>
        <div class="space-y-1">
          <router-link v-for="t in results.targets" :key="t.id" :to="`/goals/${t.goalId}`" class="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100">{{ t.title }}</router-link>
        </div>
      </section>

      <section v-if="results.tasks.length">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Tasks</h2>
        <div class="space-y-1">
          <p v-for="t in results.tasks" :key="t.id" class="rounded-lg px-3 py-2 text-sm text-stone-700">{{ t.title }}</p>
        </div>
      </section>

      <section v-if="results.notes.length">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Notes</h2>
        <div class="space-y-1">
          <p v-for="n in results.notes" :key="n.id" class="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">{{ n.content }}</p>
        </div>
      </section>

      <section v-if="results.reviews.length">
        <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Daily reviews</h2>
        <div class="space-y-1">
          <router-link v-for="r in results.reviews" :key="r.id" :to="`/review/${r.date}`" class="block rounded-lg px-3 py-2 text-sm hover:bg-stone-100">{{ r.date }}</router-link>
        </div>
      </section>

      <EmptyState v-if="!hasResults()" icon="search" :message="`No results for “${query}”.`" />
    </div>
    <EmptyState v-else icon="search" message="Start typing to search across goals, plans, tasks, and notes." />
  </div>
</template>
