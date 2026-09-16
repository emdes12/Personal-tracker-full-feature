<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import type { TaskOccurrence } from "../types";
import { formatTime, addDays } from "../lib/date";
import * as tasksApi from "../api/tasks";
import * as notesApi from "../api/notes";
import { useToast } from "../composables/useToast";
import Icon from "./Icon.vue";

const props = defineProps<{ occurrence: TaskOccurrence; carriedOver?: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const toast = useToast();

const busy = ref(false);
const menuOpen = ref(false);
const noteOpen = ref(false);
const noteText = ref("");
const savingNote = ref(false);
const focusBusy = ref(false);
const focusMenuOpen = ref(false);
const nowTick = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | undefined;

// Pomodoro-style target: purely a client-side countdown overlay on top of
// the server-tracked open-ended focus session (see focusStartedAt) — no
// schema change needed, since the server only ever needs the real elapsed
// minutes on stop, not the planned duration. Resets on reload, which is
// fine: the session just falls back to the open-ended count-up display.
const targetMinutes = ref<number | null>(null);
const POMODORO_PRESETS = [
  { label: "25 min", minutes: 25 },
  { label: "50 min", minutes: 50 },
];

const priorityColor: Record<string, string> = {
  urgent: "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200",
  high: "bg-orange-50 text-orange-600 ring-1 ring-inset ring-orange-200",
  medium: "bg-stone-100 text-stone-600",
  low: "bg-stone-100 text-stone-400",
};

const isFocusing = computed(() => Boolean(props.occurrence.focusStartedAt));

const liveElapsedSeconds = computed(() => {
  if (!props.occurrence.focusStartedAt) return 0;
  const runningMs = nowTick.value - new Date(props.occurrence.focusStartedAt).getTime();
  return Math.max(0, Math.floor(runningMs / 1000));
});

const liveElapsedMinutes = computed(() => {
  if (!props.occurrence.focusStartedAt) return props.occurrence.focusedMinutes;
  return props.occurrence.focusedMinutes + Math.floor(liveElapsedSeconds.value / 60);
});

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const liveElapsedDisplay = computed(() => {
  if (!props.occurrence.focusStartedAt) return "";
  if (targetMinutes.value !== null) {
    const remaining = targetMinutes.value * 60 - liveElapsedSeconds.value;
    return formatClock(Math.max(0, remaining));
  }
  return formatClock(liveElapsedSeconds.value);
});

function startTicking() {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    nowTick.value = Date.now();
    if (targetMinutes.value !== null && liveElapsedSeconds.value >= targetMinutes.value * 60) {
      completePomodoro();
    }
  }, 1000);
}
function stopTicking() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = undefined;
}

watch(
  () => props.occurrence.focusStartedAt,
  (val) => {
    if (val) startTicking();
    else {
      stopTicking();
      targetMinutes.value = null;
    }
  },
  { immediate: true },
);
onUnmounted(stopTicking);

async function toggleComplete() {
  if (busy.value) return;
  busy.value = true;
  try {
    if (props.occurrence.status === "completed") {
      await tasksApi.reopenOccurrence(props.occurrence.id);
    } else {
      await tasksApi.completeOccurrence(props.occurrence.id);
      toast.success("Nice work — task completed");
    }
    emit("changed");
  } finally {
    busy.value = false;
  }
}

async function startFocus(minutes: number | null) {
  focusMenuOpen.value = false;
  if (focusBusy.value) return;
  focusBusy.value = true;
  try {
    targetMinutes.value = minutes;
    await tasksApi.startFocus(props.occurrence.id);
    emit("changed");
  } finally {
    focusBusy.value = false;
  }
}

async function stopFocus() {
  if (focusBusy.value) return;
  focusBusy.value = true;
  try {
    await tasksApi.stopFocus(props.occurrence.id);
    targetMinutes.value = null;
    emit("changed");
  } finally {
    focusBusy.value = false;
  }
}

let completingPomodoro = false;
async function completePomodoro() {
  if (completingPomodoro) return;
  completingPomodoro = true;
  const completedMinutes = targetMinutes.value;
  try {
    await tasksApi.stopFocus(props.occurrence.id);
    targetMinutes.value = null;
    toast.success(`Pomodoro complete — nice ${completedMinutes} min focus session`);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Pomodoro complete", { body: props.occurrence.title });
    }
    emit("changed");
  } finally {
    completingPomodoro = false;
  }
}

function onFocusButtonClick() {
  if (isFocusing.value) {
    stopFocus();
  } else {
    focusMenuOpen.value = !focusMenuOpen.value;
  }
}

async function skip() {
  busy.value = true;
  try {
    await tasksApi.skipOccurrence(props.occurrence.id);
    toast.info("Task skipped");
    emit("changed");
  } finally {
    busy.value = false;
    menuOpen.value = false;
  }
}

async function cancel() {
  busy.value = true;
  try {
    await tasksApi.cancelOccurrence(props.occurrence.id);
    toast.info("Task cancelled");
    emit("changed");
  } finally {
    busy.value = false;
    menuOpen.value = false;
  }
}

async function carryToTomorrow() {
  busy.value = true;
  try {
    const tomorrow = addDays(props.occurrence.scheduledDate, 1);
    await tasksApi.rescheduleOccurrence(props.occurrence.id, tomorrow);
    toast.success("Carried to tomorrow");
    emit("changed");
  } finally {
    busy.value = false;
    menuOpen.value = false;
  }
}

function openNote() {
  menuOpen.value = false;
  noteOpen.value = true;
}

async function saveNote() {
  if (!noteText.value.trim()) return;
  savingNote.value = true;
  try {
    await notesApi.createNote({ content: noteText.value.trim(), occurrenceId: props.occurrence.id });
    noteText.value = "";
    noteOpen.value = false;
    toast.success("Note saved");
  } finally {
    savingNote.value = false;
  }
}
</script>

<template>
  <div
    class="rounded-xl border transition-all"
    :class="carriedOver ? 'border-amber-200 bg-amber-50' : isFocusing ? 'border-emerald-300 bg-white shadow-sm' : 'border-stone-200 bg-white hover:border-stone-300'"
  >
    <div class="flex items-center gap-3 px-3 py-2.5">
      <button
        class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
        :class="occurrence.status === 'completed' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300 hover:border-emerald-500'"
        :disabled="busy"
        @click="toggleComplete"
      >
        <Icon v-if="occurrence.status === 'completed'" name="check" :size="13" />
      </button>

      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium" :class="occurrence.status === 'completed' ? 'text-stone-400 line-through' : 'text-stone-900'">
          {{ occurrence.title }}
        </p>
        <p v-if="occurrence.startAt || liveElapsedMinutes > 0" class="flex items-center gap-1 text-xs text-stone-400">
          <template v-if="occurrence.startAt">{{ formatTime(occurrence.startAt) }}<span v-if="occurrence.endAt"> – {{ formatTime(occurrence.endAt) }}</span></template>
          <span v-if="liveElapsedMinutes > 0" class="inline-flex items-center gap-0.5" :class="{ 'ml-1': occurrence.startAt }">
            <Icon name="clock" :size="11" />{{ isFocusing ? "focusing" : "focused" }} {{ liveElapsedMinutes }}m
          </span>
        </p>
      </div>

      <span v-if="occurrence.priority !== 'medium'" class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize" :class="priorityColor[occurrence.priority]">
        {{ occurrence.priority }}
      </span>

      <div v-if="occurrence.status !== 'completed'" class="relative shrink-0">
        <button
          class="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
          :class="isFocusing ? 'bg-emerald-600 text-white' : 'border border-stone-300 text-stone-500 hover:border-stone-400 hover:text-stone-700'"
          :disabled="focusBusy"
          @click="onFocusButtonClick"
        >
          <Icon name="clock" :size="12" />
          {{ isFocusing ? liveElapsedDisplay : "Focus" }}
        </button>
        <div v-if="focusMenuOpen" class="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
          <button
            v-for="preset in POMODORO_PRESETS"
            :key="preset.minutes"
            class="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-stone-600 hover:bg-stone-50"
            @click="startFocus(preset.minutes)"
          >
            {{ preset.label }}
          </button>
          <button class="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm text-stone-600 hover:bg-stone-50" @click="startFocus(null)">
            No limit
          </button>
        </div>
      </div>

      <div class="relative shrink-0">
        <button class="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600" @click="menuOpen = !menuOpen">
          <Icon name="dots" :size="16" />
        </button>
        <div v-if="menuOpen" class="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
          <button class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-stone-600 hover:bg-stone-50" @click="openNote">
            <Icon name="note" :size="14" /> Add note
          </button>
          <button class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-stone-600 hover:bg-stone-50" @click="carryToTomorrow">
            <Icon name="chevron-right" :size="14" /> Carry to tomorrow
          </button>
          <button class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-stone-600 hover:bg-stone-50" @click="skip">
            <Icon name="chevron-right" :size="14" /> Skip
          </button>
          <button class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-600 hover:bg-stone-50" @click="cancel">
            <Icon name="close" :size="14" /> Cancel
          </button>
        </div>
      </div>
    </div>

    <div v-if="noteOpen" class="flex gap-2 border-t border-stone-100 px-3 py-2">
      <input
        v-model="noteText"
        type="text"
        placeholder="Quick note…"
        autofocus
        class="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm focus:border-stone-500 focus:outline-none"
        @keyup.enter="saveNote"
      />
      <button class="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50" :disabled="savingNote" @click="saveNote">Save</button>
    </div>
  </div>
</template>
