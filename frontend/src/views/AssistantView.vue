<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import * as aiApi from "../api/ai";
import * as tasksApi from "../api/tasks";
import * as targetsApi from "../api/targets";
import type { AiChatMessage, AiProposedTask, AiProposedTarget } from "../types";
import Icon from "../components/Icon.vue";
import EmptyState from "../components/EmptyState.vue";
import MarkdownContent from "../components/MarkdownContent.vue";
import { useToast } from "../composables/useToast";

const toast = useToast();

interface DisplayMessage extends AiChatMessage {
  id: number;
  proposedTasks?: AiProposedTask[];
  proposedTargets?: { goalId: string; targets: AiProposedTarget[] } | null;
  addedTaskIndices?: Set<number>;
  addedTargetIndices?: Set<number>;
}

const configured = ref<boolean | null>(null);
const messages = ref<DisplayMessage[]>([]);
const input = ref("");
const sending = ref(false);
const scrollAnchor = ref<HTMLElement | null>(null);
let nextId = 1;

const SUGGESTIONS = ["How am I doing on my goals?", "Break down one of my goals into milestones", "Plan a task for tomorrow"];

async function checkStatus() {
  const res = await aiApi.getAiStatus();
  configured.value = res.configured;
}

onMounted(checkStatus);

function scrollDown() {
  nextTick(() => scrollAnchor.value?.scrollIntoView({ behavior: "smooth" }));
}

async function send(text?: string) {
  const content = (text ?? input.value).trim();
  if (!content || sending.value) return;

  const history = messages.value.map((m) => ({ role: m.role, content: m.content }));
  messages.value.push({ id: nextId++, role: "user", content });
  input.value = "";
  sending.value = true;
  scrollDown();

  try {
    const result = await aiApi.sendChatMessage(content, history);
    messages.value.push({
      id: nextId++,
      role: "assistant",
      content: result.reply,
      proposedTasks: result.proposedTasks,
      proposedTargets: result.proposedTargets,
      addedTaskIndices: new Set(),
      addedTargetIndices: new Set(),
    });
  } catch {
    messages.value.push({ id: nextId++, role: "assistant", content: "Something went wrong reaching the assistant. Try again in a moment." });
  } finally {
    sending.value = false;
    scrollDown();
  }
}

async function addProposedTask(msg: DisplayMessage, task: AiProposedTask, index: number) {
  await tasksApi.createTask({
    title: task.title,
    scheduledDate: task.scheduledDate,
    startTime: task.startTime ?? null,
    endTime: task.endTime ?? null,
    priority: task.priority,
    goalId: task.goalId ?? null,
  });
  msg.addedTaskIndices?.add(index);
  toast.success("Task added");
}

async function addProposedTarget(msg: DisplayMessage, target: AiProposedTarget, index: number) {
  if (!msg.proposedTargets) return;
  await targetsApi.createTarget({
    goalId: msg.proposedTargets.goalId,
    title: target.title,
    type: target.type,
    dueDate: target.dueDate ?? null,
  });
  msg.addedTargetIndices?.add(index);
  toast.success("Target added");
}

const isEmpty = computed(() => messages.value.length === 0);
</script>

<template>
  <div class="flex h-[calc(100vh-8rem)] flex-col md:h-[calc(100vh-4rem)]">
    <header class="mb-4">
      <h1 class="flex items-center gap-2 text-2xl font-semibold text-stone-900">
        <Icon name="sparkles" :size="22" class="text-emerald-600" /> Assistant
      </h1>
      <p class="text-sm text-stone-400">Ask about your progress, plan tasks, or break a goal into milestones.</p>
    </header>

    <div v-if="configured === false" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      The AI assistant isn't configured yet. Set <code class="rounded bg-amber-100 px-1">GOOGLE_AI_API_KEY</code> on the backend to enable it.
    </div>

    <template v-else>
      <div class="flex-1 space-y-4 overflow-y-auto pr-1">
        <EmptyState v-if="isEmpty" icon="sparkles" message="Ask me anything about your plan.">
          <div class="mt-3 flex flex-wrap justify-center gap-2">
            <button
              v-for="s in SUGGESTIONS"
              :key="s"
              class="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-stone-400"
              @click="send(s)"
            >
              {{ s }}
            </button>
          </div>
        </EmptyState>

        <div v-for="m in messages" :key="m.id" class="flex" :class="m.role === 'user' ? 'justify-end' : 'justify-start'">
          <div class="max-w-[85%] space-y-2">
            <div
              class="rounded-2xl px-4 py-2.5 text-sm"
              :class="m.role === 'user' ? 'bg-stone-900 text-white' : 'border border-stone-200 bg-white text-stone-800'"
            >
              <MarkdownContent v-if="m.role === 'assistant'" :content="m.content" />
              <template v-else>{{ m.content }}</template>
            </div>

            <div v-if="m.proposedTasks?.length" class="space-y-2">
              <div v-for="(t, i) in m.proposedTasks" :key="i" class="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p class="text-sm font-medium text-stone-900">{{ t.title }}</p>
                <p class="text-xs text-stone-500">{{ t.scheduledDate }}<span v-if="t.startTime"> · {{ t.startTime }}</span></p>
                <button
                  v-if="!m.addedTaskIndices?.has(i)"
                  class="mt-2 flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-1 text-xs font-medium text-white"
                  @click="addProposedTask(m, t, i)"
                >
                  <Icon name="plus" :size="12" /> Add task
                </button>
                <span v-else class="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600"><Icon name="check" :size="12" /> Added</span>
              </div>
            </div>

            <div v-if="m.proposedTargets?.targets.length" class="space-y-2">
              <div v-for="(t, i) in m.proposedTargets.targets" :key="i" class="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <span class="text-[11px] font-medium uppercase tracking-wide text-stone-400">{{ t.type }}</span>
                <p class="text-sm font-medium text-stone-900">{{ t.title }}</p>
                <p v-if="t.dueDate" class="text-xs text-stone-500">Due {{ t.dueDate }}</p>
                <button
                  v-if="!m.addedTargetIndices?.has(i)"
                  class="mt-2 flex items-center gap-1 rounded-lg bg-stone-900 px-3 py-1 text-xs font-medium text-white"
                  @click="addProposedTarget(m, t, i)"
                >
                  <Icon name="plus" :size="12" /> Add target
                </button>
                <span v-else class="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-600"><Icon name="check" :size="12" /> Added</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="sending" class="flex justify-start">
          <div class="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-400">Thinking…</div>
        </div>
        <div ref="scrollAnchor" />
      </div>

      <form class="mt-4 flex gap-2" @submit.prevent="send()">
        <input
          v-model="input"
          type="text"
          placeholder="Ask the assistant…"
          class="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:border-stone-500 focus:outline-none"
        />
        <button type="submit" :disabled="sending || !input.trim()" class="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
          Send
        </button>
      </form>
          <div class="mt-3 flex flex-wrap justify-center gap-2">
            <button
              v-for="s in SUGGESTIONS"
              :key="s"
              class="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-stone-400"
              @click="send(s)"
            >
              {{ s }}
            </button>
          </div>
    </template>
  </div>
</template>
