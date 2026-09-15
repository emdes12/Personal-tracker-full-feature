<script setup lang="ts">
withDefaults(defineProps<{ count?: number; height?: string }>(), { count: 3, height: "h-16" });
</script>

<template>
  <div class="space-y-2">
    <div v-for="i in count" :key="i" class="animate-pulse rounded-xl border border-stone-200 bg-stone-100" :class="height" />
  </div>
</template>
