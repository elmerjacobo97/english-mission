import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { generateStructured } from "./gateway.server"
import type { GenerateStructuredInput } from "./types"

type Answer = { answer: string }

const aiEnvKeys = ["AI_BASE_URL", "AI_API_KEY", "AI_MODEL"] as const
const originalEnv = Object.fromEntries(
  aiEnvKeys.map((key) => [key, process.env[key]]),
)
const fetchMock = vi.fn()

function enableAi(model = "test/model") {
  process.env.AI_BASE_URL = "https://example.test/v1/chat/completions"
  process.env.AI_API_KEY = "secret-test-key"
  process.env.AI_MODEL = model
}

function structuredInput(
  parse: GenerateStructuredInput<Answer>["parse"] = () => ({
    answer: "ok",
  }),
  model?: string,
): GenerateStructuredInput<Answer> {
  return {
    messages: [
      { role: "system", content: "Return one answer." },
      { role: "user", content: "Say hello." },
    ],
    schema: {
      name: "answer",
      strict: true,
      schema: {
        type: "object",
        properties: { answer: { type: "string" } },
        required: ["answer"],
        additionalProperties: false,
      },
    },
    parse,
    ...(model ? { model } : {}),
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

beforeEach(() => {
  for (const key of aiEnvKeys) {
    delete process.env[key]
  }
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()

  for (const key of aiEnvKeys) {
    const value = originalEnv[key]

    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

describe("generateStructured", () => {
  test("sends structured request and parses valid response", async () => {
    enableAi()
    const parse = vi.fn().mockReturnValue({ answer: "ok" })
    const input = structuredInput(parse)
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        choices: [{ message: { content: '{"answer":"ok"}' } }],
        usage: {
          prompt_tokens: 11,
          completion_tokens: 4,
          total_tokens: 15,
        },
      }),
    )

    await expect(generateStructured(input)).resolves.toEqual({
      ok: true,
      value: { answer: "ok" },
      model: "test/model",
      usage: {
        promptTokens: 11,
        completionTokens: 4,
        totalTokens: 15,
      },
    })
    expect(parse).toHaveBeenCalledWith({ answer: "ok" })

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://example.test/v1/chat/completions")
    expect(request).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer secret-test-key",
        "Content-Type": "application/json",
      },
    })
    expect(JSON.parse(request.body as string)).toEqual({
      model: "test/model",
      messages: input.messages,
      response_format: {
        type: "json_schema",
        json_schema: input.schema,
      },
    })
  })

  test("uses model override without changing configured model", async () => {
    enableAi("configured/model")
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        choices: [{ message: { content: '{"answer":"ok"}' } }],
      }),
    )

    await expect(
      generateStructured(structuredInput(undefined, "override/model")),
    ).resolves.toMatchObject({ ok: true, model: "override/model" })

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(request.body as string).model).toBe("override/model")
  })

  test("returns disabled without calling fetch when API key is absent", async () => {
    await expect(generateStructured(structuredInput())).resolves.toEqual({
      ok: false,
      code: "disabled",
      retryable: false,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test.each([
    [429, "rate-limited", true],
    [400, "provider-error", false],
    [503, "provider-error", true],
  ] as const)("maps HTTP %s to %s", async (status, code, retryable) => {
    enableAi()
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { message: "provider secret" } }, status),
    )

    const result = await generateStructured(structuredInput())

    expect(result).toEqual({ ok: false, code, retryable })
    expect(JSON.stringify(result)).not.toContain("provider secret")
    expect(JSON.stringify(result)).not.toContain("secret-test-key")
  })

  test("maps network errors without exposing provider details", async () => {
    enableAi()
    fetchMock.mockRejectedValueOnce(new Error("provider secret"))

    const result = await generateStructured(structuredInput())

    expect(result).toEqual({
      ok: false,
      code: "provider-error",
      retryable: true,
    })
    expect(JSON.stringify(result)).not.toContain("provider secret")
    expect(JSON.stringify(result)).not.toContain("secret-test-key")
  })

  test.each([
    ["empty content", "   "],
    ["invalid JSON", "not-json"],
  ])("returns invalid-response for %s", async (_name, content) => {
    enableAi()
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ choices: [{ message: { content } }] }),
    )

    await expect(generateStructured(structuredInput())).resolves.toEqual({
      ok: false,
      code: "invalid-response",
      retryable: false,
    })
  })

  test("returns invalid-response when parser rejects response", async () => {
    enableAi()
    const parse = vi.fn().mockReturnValue(null)
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        choices: [{ message: { content: '{"answer":"unexpected"}' } }],
      }),
    )

    await expect(generateStructured(structuredInput(parse))).resolves.toEqual({
      ok: false,
      code: "invalid-response",
      retryable: false,
    })
    expect(parse).toHaveBeenCalledWith({ answer: "unexpected" })
  })

  test("returns invalid-response when provider JSON cannot be read", async () => {
    enableAi()
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new Error("provider secret")),
    })

    await expect(generateStructured(structuredInput())).resolves.toEqual({
      ok: false,
      code: "invalid-response",
      retryable: false,
    })
  })

  test("returns invalid-config for an invalid endpoint", async () => {
    process.env.AI_BASE_URL = "not-a-url"
    process.env.AI_API_KEY = "secret-test-key"

    await expect(generateStructured(structuredInput())).resolves.toEqual({
      ok: false,
      code: "invalid-config",
      retryable: false,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
