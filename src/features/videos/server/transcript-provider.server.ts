import "server-only"

import {
  normalizeTranscriptPayload,
  type NormalizedTranscript,
  type TranscriptNormalizationError,
} from "../utils/video"

const DEFAULT_TRANSCRIPT_BASE_URL =
  "https://api.supadata.ai/v1/transcript"
const REQUEST_TIMEOUT_MS = 15_000

export type TranscriptProviderErrorCode =
  | "not-configured"
  | "invalid-config"
  | "invalid-request"
  | "unauthorized"
  | "payment-required"
  | "forbidden"
  | "not-found"
  | "rate-limited"
  | "provider-error"
  | "timeout"
  | "network-error"
  | TranscriptNormalizationError

export type TranscriptProviderResult =
  | { ok: true; value: NormalizedTranscript }
  | {
      ok: false
      code: TranscriptProviderErrorCode
      retryable: boolean
    }

type TranscriptProviderConfig =
  | { enabled: true; baseUrl: string; apiKey: string }
  | { enabled: false; code: "not-configured" | "invalid-config" }

function validUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

function getTranscriptConfig(): TranscriptProviderConfig {
  const apiKey = process.env.TRANSCRIPT_API_KEY?.trim()
  if (!apiKey) {
    return { enabled: false, code: "not-configured" }
  }

  const baseUrl =
    process.env.TRANSCRIPT_BASE_URL?.trim() || DEFAULT_TRANSCRIPT_BASE_URL
  const mode = process.env.TRANSCRIPT_MODE?.trim() || "native"

  if (!validUrl(baseUrl) || mode !== "native") {
    return { enabled: false, code: "invalid-config" }
  }

  return { enabled: true, baseUrl, apiKey }
}

export function isTranscriptProviderConfigured(): boolean {
  return getTranscriptConfig().enabled
}

function errorResult(
  code: TranscriptProviderErrorCode,
  retryable: boolean,
): TranscriptProviderResult {
  return { ok: false, code, retryable }
}

function statusError(status: number): TranscriptProviderResult {
  if (status === 206) {
    return errorResult("transcript-unavailable", false)
  }

  const statusCodes: Record<number, TranscriptProviderErrorCode> = {
    400: "invalid-request",
    401: "unauthorized",
    402: "payment-required",
    403: "forbidden",
    404: "not-found",
    429: "rate-limited",
  }
  const code = statusCodes[status]

  if (code) {
    return errorResult(code, status === 429)
  }

  return errorResult("provider-error", status >= 500)
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  )
}

export async function fetchTranscript(
  videoUrl: string,
): Promise<TranscriptProviderResult> {
  const config = getTranscriptConfig()

  if (!config.enabled) {
    return errorResult(config.code, false)
  }

  const endpoint = new URL(config.baseUrl)
  endpoint.searchParams.set("url", videoUrl)
  endpoint.searchParams.set("lang", "en")
  endpoint.searchParams.set("text", "false")
  endpoint.searchParams.set("mode", "native")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": config.apiKey,
      },
      signal: controller.signal,
    })
  } catch (error) {
    return errorResult(
      controller.signal.aborted || isAbortError(error)
        ? "timeout"
        : "network-error",
      true,
    )
  } finally {
    clearTimeout(timeout)
  }

  if (response.status === 206 || !response.ok) {
    return statusError(response.status)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return errorResult("invalid-response", false)
  }

  const result = normalizeTranscriptPayload(payload)
  if (!result.ok) {
    return errorResult(result.code, false)
  }

  return result
}
