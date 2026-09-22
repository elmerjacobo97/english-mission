import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { fetchTranscript } from "./transcript-provider.server"

const transcriptEnvKeys = [
  "TRANSCRIPT_BASE_URL",
  "TRANSCRIPT_API_KEY",
  "TRANSCRIPT_MODE",
] as const
const originalEnv = Object.fromEntries(
  transcriptEnvKeys.map((key) => [key, process.env[key]]),
)
const fetchMock = vi.fn()

function enableProvider() {
  process.env.TRANSCRIPT_BASE_URL = "https://example.test/v1/transcript"
  process.env.TRANSCRIPT_API_KEY = "secret-test-key"
  process.env.TRANSCRIPT_MODE = "native"
}

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

function invalidJsonResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockRejectedValue(new Error("secret")),
  } as unknown as Response
}

function validPayload() {
  return {
    lang: "en",
    content: [{ text: "Hello", offset: 0, duration: 1000, lang: "en" }],
  }
}

beforeEach(() => {
  for (const key of transcriptEnvKeys) {
    delete process.env[key]
  }
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()

  for (const key of transcriptEnvKeys) {
    const value = originalEnv[key]

    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

describe("fetchTranscript", () => {
  test("requests native English transcript and normalizes response", async () => {
    enableProvider()
    fetchMock.mockResolvedValueOnce(jsonResponse(validPayload()))

    await expect(
      fetchTranscript("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).resolves.toEqual({
      ok: true,
      value: {
        language: "en",
        segments: [{ text: "Hello", startMs: 0, durationMs: 1000 }],
      },
    })

    const [requestUrl, request] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ]
    const url = new URL(requestUrl)
    expect(url.origin + url.pathname).toBe(
      "https://example.test/v1/transcript",
    )
    expect(url.searchParams.get("url")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    )
    expect(url.searchParams.get("lang")).toBe("en")
    expect(url.searchParams.get("text")).toBe("false")
    expect(url.searchParams.get("mode")).toBe("native")
    expect(request).toMatchObject({
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-api-key": "secret-test-key",
      },
    })
  })

  test("does not call provider without an API key", async () => {
    await expect(fetchTranscript("https://youtu.be/dQw4w9WgXcQ")).resolves.toEqual(
      {
        ok: false,
        code: "not-configured",
        retryable: false,
      },
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test("rejects non-native mode instead of enabling provider fallback", async () => {
    enableProvider()
    process.env.TRANSCRIPT_MODE = "auto"

    await expect(fetchTranscript("https://youtu.be/dQw4w9WgXcQ")).resolves.toEqual(
      {
        ok: false,
        code: "invalid-config",
        retryable: false,
      },
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test.each([
    [206, "transcript-unavailable", false],
    [400, "invalid-request", false],
    [401, "unauthorized", false],
    [402, "payment-required", false],
    [403, "forbidden", false],
    [404, "not-found", false],
    [429, "rate-limited", true],
    [503, "provider-error", true],
  ] as const)("maps HTTP %s to %s", async (status, code, retryable) => {
    enableProvider()
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { message: "provider secret" } }, status),
    )

    const result = await fetchTranscript("https://youtu.be/dQw4w9WgXcQ")

    expect(result).toEqual({ ok: false, code, retryable })
    expect(JSON.stringify(result)).not.toContain("provider secret")
    expect(JSON.stringify(result)).not.toContain("secret-test-key")
  })

  test("maps network and timeout errors without provider details", async () => {
    enableProvider()
    fetchMock.mockRejectedValueOnce(new Error("provider secret"))
    await expect(fetchTranscript("https://youtu.be/dQw4w9WgXcQ")).resolves.toEqual(
      {
        ok: false,
        code: "network-error",
        retryable: true,
      },
    )

    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    )
    await expect(fetchTranscript("https://youtu.be/dQw4w9WgXcQ")).resolves.toEqual(
      {
        ok: false,
        code: "timeout",
        retryable: true,
      },
    )
  })

  test.each([
    ["invalid JSON", invalidJsonResponse()],
    ["unsupported language", jsonResponse({ lang: "es", content: [] })],
    ["empty transcript", jsonResponse({ lang: "en", content: [] })],
  ] as const)("maps %s to a controlled error", async (_name, response) => {
    enableProvider()
    fetchMock.mockResolvedValueOnce(response)

    const result = await fetchTranscript("https://youtu.be/dQw4w9WgXcQ")

    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toContain("secret")
  })
})
