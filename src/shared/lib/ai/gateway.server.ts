import "server-only"

import { getAiConfig } from "./config.server"
import type {
  AiErrorCode,
  AiJsonSchema,
  AiResult,
  AiUsage,
  GenerateStructuredInput,
} from "./types"

const REQUEST_TIMEOUT_MS = 15_000

type ProviderResponse = Record<string, unknown>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function errorResult<T>(
  code: AiErrorCode,
  retryable: boolean,
): AiResult<T> {
  return { ok: false, code, retryable }
}

function responseFormat(schema: AiJsonSchema) {
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      ...(schema.strict === undefined ? {} : { strict: schema.strict }),
      schema: schema.schema,
    },
  }
}

function validUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function responseContent(value: unknown): string | null {
  if (!isRecord(value) || !Array.isArray(value.choices)) {
    return null
  }

  const choice = value.choices[0]
  if (!isRecord(choice) || !isRecord(choice.message)) {
    return null
  }

  const content = choice.message.content
  return typeof content === "string" && content.trim() ? content : null
}

function responseUsage(value: unknown): AiUsage | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const promptTokens = value.prompt_tokens
  const completionTokens = value.completion_tokens
  const totalTokens = value.total_tokens

  if (
    typeof promptTokens !== "number" ||
    typeof completionTokens !== "number" ||
    typeof totalTokens !== "number" ||
    !Number.isFinite(promptTokens) ||
    !Number.isFinite(completionTokens) ||
    !Number.isFinite(totalTokens)
  ) {
    return undefined
  }

  return { promptTokens, completionTokens, totalTokens }
}

function statusError<T>(status: number): AiResult<T> {
  if (status === 429) {
    return errorResult("rate-limited", true)
  }

  return errorResult("provider-error", status >= 500)
}

export async function generateStructured<T>(
  input: GenerateStructuredInput<T>,
): Promise<AiResult<T>> {
  const config = getAiConfig()

  if (!config.enabled) {
    return errorResult("disabled", false)
  }

  if (!validUrl(config.baseUrl) || !config.model) {
    return errorResult("invalid-config", false)
  }

  const model = input.model?.trim() || config.model
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(config.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: input.messages,
        response_format: responseFormat(input.schema),
      }),
      signal: controller.signal,
    })
  } catch {
    return errorResult("provider-error", true)
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    return statusError(response.status)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return errorResult("invalid-response", false)
  }

  const content = responseContent(payload)
  if (!content) {
    return errorResult("invalid-response", false)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return errorResult("invalid-response", false)
  }

  let value: T | null
  try {
    value = input.parse(parsed)
  } catch {
    return errorResult("invalid-response", false)
  }

  if (value === null) {
    return errorResult("invalid-response", false)
  }

  const providerPayload = isRecord(payload)
    ? (payload as ProviderResponse)
    : undefined
  const usage = responseUsage(providerPayload?.usage)

  return {
    ok: true,
    value,
    model,
    ...(usage ? { usage } : {}),
  }
}
