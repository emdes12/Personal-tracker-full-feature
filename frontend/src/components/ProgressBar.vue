<script setup lang="ts">
defineProps<{ percent: number; size?: "sm" | "md" }>();
</script>

<template>
  <div class="w-full overflow-hidden rounded-full bg-stone-200" :class="size === 'sm' ? 'h-1.5' : 'h-2.5'">
    <div
      class="h-full rounded-full bg-emerald-600 transition-all duration-300"
      :style="{ width: `${Math.min(100, Math.max(0, percent))}%` }"
    />
  </div>
</template>
