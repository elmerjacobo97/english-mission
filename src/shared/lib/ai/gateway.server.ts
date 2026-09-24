import "server-only"

import { getAiConfig, type AiConfig } from "./config.server"
import type {
  AiErrorCode,
  AiJsonSchema,
  AiResult,
  AiUsage,
  GenerateStructuredInput,
} from "./types"

const REQUEST_TIMEOUT_MS = 15_000
const FAST_RETRY_WINDOW_MS = 10_000

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

// Some gateways (OpenRouter) answer HTTP 200 with a top-level `error` object
// when the upstream model is overloaded or rate limited.
function embeddedProviderError<T>(payload: unknown): AiResult<T> | null {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return null
  }

  const code = payload.error.code ?? payload.error.status
  return errorResult(code === 429 ? "rate-limited" : "provider-error", true)
}

async function requestStructured<T>(
  input: GenerateStructuredInput<T>,
  config: Extract<AiConfig, { enabled: true }>,
  model: string,
): Promise<AiResult<T>> {
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

  const providerError = embeddedProviderError<T>(payload)
  if (providerError) {
    return providerError
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

async function timedRequest<T>(
  input: GenerateStructuredInput<T>,
  config: Extract<AiConfig, { enabled: true }>,
  model: string,
): Promise<{ result: AiResult<T>; ms: number }> {
  const started = Date.now()
  return { result: await requestStructured(input, config, model), ms: Date.now() - started }
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

  // Free-tier upstreams fast-fail with 503s while overloaded and usually
  // recover within seconds, so retry retryable errors up to two extra times.
  // A slow attempt means the route itself is dying; surface it instead of
  // stacking 15s timeouts.
  // ponytail: 2 fast retries, no backoff; add backoff + jitter if load demands.
  let last = await timedRequest(input, config, model)
  for (
    let retry = 0;
    !last.result.ok &&
    last.result.retryable &&
    last.ms < FAST_RETRY_WINDOW_MS &&
    retry < 2;
    retry += 1
  ) {
    last = await timedRequest(input, config, model)
  }

  return last.result
}
