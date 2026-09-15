<script setup lang="ts">
import Icon from "./Icon.vue";
import type { IconName } from "./Icon.vue";

withDefaults(defineProps<{ icon?: IconName; message: string }>(), { icon: "inbox" });
</script>

<template>
  <div class="flex flex-col items-center gap-2 py-12 text-center">
    <Icon :name="icon" :size="28" class="text-stone-300" />
    <p class="text-sm text-stone-400">{{ message }}</p>
    <slot />
  </div>
</template>
