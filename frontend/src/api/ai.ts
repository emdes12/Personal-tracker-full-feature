import { api } from "./client";
import type { AiChatMessage, AiChatResult } from "../types";

export function getAiStatus() {
  return api.get<{ configured: boolean }>("/ai/status");
}

export function sendChatMessage(message: string, history: AiChatMessage[]) {
  return api.post<AiChatResult>("/ai/chat", { message, history });
}
