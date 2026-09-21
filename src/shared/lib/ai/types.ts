export type AiMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type AiJsonSchema = {
  name: string
  strict?: boolean
  schema: Record<string, unknown>
}

export type GenerateStructuredInput<T> = {
  messages: AiMessage[]
  schema: AiJsonSchema
  parse: (value: unknown) => T | null
  model?: string
}

export type AiUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type AiErrorCode =
  | "disabled"
  | "invalid-config"
  | "provider-error"
  | "rate-limited"
  | "invalid-response"

export type AiResult<T> =
  | {
      ok: true
      value: T
      model: string
      usage?: AiUsage
    }
  | {
      ok: false
      code: AiErrorCode
      retryable: boolean
    }
