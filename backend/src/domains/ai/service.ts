import type OpenAI from "openai";
import { getAiClient, getAiModel } from "./client";
import { listGoals } from "../goals/service";
import { todayInTimezone } from "../../lib/time";
import { BadRequestError } from "../../lib/errors";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ToolCallFunction {
  proposedTasks: ProposedTask[];
  proposedTargets: ChatResult["proposedTargets"];
}

export interface ProposedTask {
  title: string;
  scheduledDate: string;
  startTime?: string | null;
  endTime?: string | null;
  priority?: "low" | "medium" | "high" | "urgent";
  goalId?: string | null;
}

export interface ProposedTarget {
  title: string;
  type: "milestone" | "monthly" | "weekly" | "custom";
  dueDate?: string | null;
}

export interface ChatResult {
  reply: string;
  proposedTasks: ProposedTask[];
  proposedTargets: { goalId: string; targets: ProposedTarget[] } | null;
}

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "propose_tasks",
      description: "Propose one or more concrete daily tasks for the user to review and confirm. Only call this when the user is asking to create, add, or plan specific tasks — never call it just to illustrate an idea.",
      parameters: {
        type: "object",
        properties: {
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                scheduledDate: { type: "string", description: "Calendar date in YYYY-MM-DD" },
                startTime: { type: "string", description: "24h HH:MM, omit if not time-specific" },
                endTime: { type: "string", description: "24h HH:MM, omit if not time-specific" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                goalId: { type: "string", description: "Id of an existing goal this task contributes to, if any" },
              },
              required: ["title", "scheduledDate"],
            },
          },
        },
        required: ["tasks"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_targets",
      description: "Propose milestone/monthly/weekly targets to break one specific existing goal down into. Only call this when the user asks to break down, plan, or organize a goal they already have.",
      parameters: {
        type: "object",
        properties: {
          goalId: { type: "string", description: "Id of the existing goal being broken down" },
          targets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                type: { type: "string", enum: ["milestone", "monthly", "weekly", "custom"] },
                dueDate: { type: "string", description: "YYYY-MM-DD, optional" },
              },
              required: ["title", "type"],
            },
          },
        },
        required: ["goalId", "targets"],
      },
    },
  },
];

async function buildSystemPrompt(userId: string, timezone: string): Promise<string> {
  const today = todayInTimezone(timezone);
  const goals = await listGoals(userId);
  const activeGoals = goals.filter((g) => g.status === "active");

  const goalLines = activeGoals.length
    ? activeGoals
        .map((g) => `- id=${g.id} "${g.title}" — ${g.progress.percent}% complete, ${g.deadline ? `deadline ${g.deadline}` : "no deadline"}, status: ${g.health}`)
        .join("\n")
    : "(no active goals yet)";

  return `You are the planning assistant inside a personal execution app (Plan -> Goal -> Target -> Daily Task -> completion). You help the user plan, break down goals, and understand their progress.

Today's date is ${today} (user's timezone: ${timezone}).

The user's active goals:
${goalLines}

Rules:
- Progress percentages are computed from ACTUAL completed tasks, never from what was planned — treat them as ground truth about real progress, not intentions.
- You never create, edit, or delete anything directly. When the user wants tasks created or a goal broken into targets, call the matching tool (propose_tasks / propose_targets) — the app will show the user your proposal and only creates anything if they explicitly confirm it.
- Only call a tool when the user is actually asking for that kind of planning action. For questions ("why am I behind on X", "how's my week going", "what should I focus on") just answer in plain text using the goal data above — don't call a tool.
- Keep replies concise and concrete. Reference real goal titles/percentages/deadlines from the list above rather than generic advice.`;
}

export async function chat(userId: string, timezone: string, message: string, history: ChatMessage[]): Promise<ChatResult> {
  const client = getAiClient();
  if (!client) {
    throw new BadRequestError("The AI assistant isn't configured. Set GOOGLE_AI_API_KEY on the backend to enable it.");
  }

  const systemPrompt = await buildSystemPrompt(userId, timezone);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
    { role: "user", content: message },
  ];

  const completion = await client.chat.completions.create({
    model: getAiModel(),
    messages,
    tools: TOOLS,
    temperature: 0.4,
  });

  const choice = completion.choices[0];
  const toolCalls = choice.message.tool_calls ?? [];


  const toolsCall = callTools(toolCalls);
  const proposedTasks: ProposedTask[] = toolsCall.proposedTasks;
  let proposedTargets: ChatResult["proposedTargets"] = toolsCall.proposedTargets;

  const reply =
    choice.message.content?.trim() ||
    (proposedTasks.length || proposedTargets ? "Here's what I'd suggest — take a look below." : "I'm not sure how to help with that yet.");

  return { reply, proposedTasks, proposedTargets };
}

function callTools(tools:OpenAI.Chat.Completions.ChatCompletionToolCall[]): { proposedTasks: ProposedTask[]; proposedTargets: ChatResult["proposedTargets"] } {
  
  const proposedTasks: ProposedTask[] = [];
  let proposedTargets: ChatResult["proposedTargets"] = null;

  for (const call of tools) {
    if (call.type !== "function") continue;
    try {
      const args = JSON.parse(call.function.arguments);
      if (call.function.name === "propose_tasks" && Array.isArray(args.tasks)) {
        proposedTasks.push(...args.tasks);
      } else if (call.function.name === "propose_targets" && args.goalId && Array.isArray(args.targets)) {
        proposedTargets = { goalId: args.goalId, targets: args.targets };
      }
    } catch {
      // Malformed tool call arguments — skip rather than fail the whole reply.
    }
  }
  return { proposedTasks, proposedTargets };
}