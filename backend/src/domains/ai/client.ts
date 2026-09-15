import OpenAI from "openai";

let client: OpenAI | null = null;
let attempted = false;

/**
 * Lazily-constructed client for Gemini's OpenAI-compatible endpoint. Returns
 * null (rather than throwing at import time) when no key is configured, so
 * the rest of the app works fully without AI — routes check this and return
 * a clear "not configured" error instead of crashing the process.
 */
export function getAiClient(): OpenAI | null {
  if (attempted) return client;
  attempted = true;
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;
  client = new OpenAI({
    apiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
  return client;
}

export function getAiModel(): string {
  return process.env.GOOGLE_AI_MODEL || "gemini-3.6-flash";
}
