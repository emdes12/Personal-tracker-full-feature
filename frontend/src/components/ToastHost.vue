<script setup lang="ts">
import { useToast } from "../composables/useToast";
import Icon from "./Icon.vue";

const { toasts } = useToast();

const styles: Record<string, string> = {
  success: "bg-stone-900 text-white",
  error: "bg-red-600 text-white",
  info: "bg-stone-700 text-white",
};
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
    <transition-group name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg"
        :class="styles[t.type]"
      >
        <Icon v-if="t.type === 'success'" name="check" :size="14" />
        <Icon v-else-if="t.type === 'error'" name="close" :size="14" />
        {{ t.message }}
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
