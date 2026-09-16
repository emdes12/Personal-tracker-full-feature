<script setup lang="ts">
import { ref } from "vue";

export interface TrendBucket {
  label: string;
  start: string;
  completed: number;
  total: number;
  percent: number;
}

const props = defineProps<{ title: string; buckets: TrendBucket[] }>();

const hoverIndex = ref<number | null>(null);

const VIEW_W = 600;
const VIEW_H = 160;
const PAD_LEFT = 4;
const PAD_RIGHT = 4;
const PAD_TOP = 8;
const PAD_BOTTOM = 22;
const GAP = 6;

function barX(i: number): number {
  const plotW = VIEW_W - PAD_LEFT - PAD_RIGHT;
  const barW = (plotW - GAP * (props.buckets.length - 1)) / props.buckets.length;
  return PAD_LEFT + i * (barW + GAP);
}

function barWidth(): number {
  const plotW = VIEW_W - PAD_LEFT - PAD_RIGHT;
  return (plotW - GAP * (props.buckets.length - 1)) / props.buckets.length;
}

function barHeight(percent: number): number {
  const plotH = VIEW_H - PAD_TOP - PAD_BOTTOM;
  return Math.max(percent > 0 ? 3 : 0, (percent / 100) * plotH);
}

function barY(percent: number): number {
  return VIEW_H - PAD_BOTTOM - barHeight(percent);
}
</script>

<template>
  <div class="rounded-2xl border border-stone-200 bg-white p-4">
    <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">{{ title }}</p>
    <div class="relative">
      <svg :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`" class="w-full" role="img" :aria-label="title">
        <!-- baseline -->
        <line :x1="PAD_LEFT" :x2="VIEW_W - PAD_RIGHT" :y1="VIEW_H - PAD_BOTTOM" :y2="VIEW_H - PAD_BOTTOM" stroke="currentColor" class="text-stone-200" stroke-width="1" />

        <g v-for="(b, i) in buckets" :key="b.start" @mouseenter="hoverIndex = i" @mouseleave="hoverIndex = null">
          <rect :x="barX(i)" :y="barY(b.percent)" :width="barWidth()" :height="barHeight(b.percent)" rx="3" class="transition-colors" :class="hoverIndex === i ? 'fill-emerald-700' : 'fill-emerald-500'" />
          <!-- invisible full-height hit target so hover works even on near-zero bars -->
          <rect :x="barX(i)" :y="PAD_TOP" :width="barWidth()" :height="VIEW_H - PAD_TOP - PAD_BOTTOM" fill="transparent" />
          <text :x="barX(i) + barWidth() / 2" :y="VIEW_H - 6" text-anchor="middle" class="fill-stone-400" font-size="9">{{ b.label }}</text>
        </g>
      </svg>

      <div
        v-if="hoverIndex !== null"
        class="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-stone-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg"
        :style="{ left: `${((barX(hoverIndex) + barWidth() / 2) / VIEW_W) * 100}%`, top: `${(barY(buckets[hoverIndex].percent) / VIEW_H) * 100}%` }"
      >
        {{ buckets[hoverIndex].percent }}% · {{ buckets[hoverIndex].completed }}/{{ buckets[hoverIndex].total }}
      </div>
    </div>
  </div>
</template>
