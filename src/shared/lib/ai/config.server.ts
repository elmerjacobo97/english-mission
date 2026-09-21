import "server-only"

export const DEFAULT_AI_BASE_URL =
  "https://openrouter.ai/api/v1/chat/completions"
export const DEFAULT_AI_MODEL = "qwen/qwen3.8-27b:free"

export type AiConfig =
  | {
      enabled: true
      baseUrl: string
      apiKey: string
      model: string
    }
  | {
      enabled: false
    }

export function getAiConfig(): AiConfig {
  const apiKey = process.env.AI_API_KEY?.trim()

  if (!apiKey) {
    return { enabled: false }
  }

  return {
    enabled: true,
    baseUrl: process.env.AI_BASE_URL?.trim() || DEFAULT_AI_BASE_URL,
    apiKey,
    model: process.env.AI_MODEL?.trim() || DEFAULT_AI_MODEL,
  }
}
