<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Capacitor } from "@capacitor/core";
import AppShell from "./components/AppShell.vue";
import ToastHost from "./components/ToastHost.vue";
import { useReminderPolling } from "./composables/useReminderPolling";
import { useNativeAlarms } from "./composables/useNativeAlarms";

const route = useRoute();
const isPublic = computed(() => Boolean(route.meta.public));

// Native (iOS/Android via Capacitor): alarms are scheduled ahead of time as
// real OS notifications so they still fire while the app is backgrounded.
// Web: fall back to foreground polling + a synthesized Web Audio alarm.
if (Capacitor.isNativePlatform()) {
  useNativeAlarms();
} else {
  useReminderPolling();
}
</script>

<template>
  <AppShell v-if="!isPublic">
    <router-view v-slot="{ Component }">
      <transition name="page" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </AppShell>
  <router-view v-else />
  <ToastHost />
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.15s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
