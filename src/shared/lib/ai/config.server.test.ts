import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  getAiConfig,
} from "./config.server"

const aiEnvKeys = ["AI_BASE_URL", "AI_API_KEY", "AI_MODEL"] as const
const originalEnv = Object.fromEntries(
  aiEnvKeys.map((key) => [key, process.env[key]]),
)

beforeEach(() => {
  for (const key of aiEnvKeys) {
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of aiEnvKeys) {
    const value = originalEnv[key]

    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

describe("getAiConfig", () => {
  test("reads configured values", () => {
    process.env.AI_BASE_URL = "https://example.test/v1/chat/completions"
    process.env.AI_API_KEY = "test-key"
    process.env.AI_MODEL = "test/model"

    expect(getAiConfig()).toEqual({
      enabled: true,
      baseUrl: "https://example.test/v1/chat/completions",
      apiKey: "test-key",
      model: "test/model",
    })
  })

  test("uses default base URL and model", () => {
    process.env.AI_API_KEY = "test-key"

    expect(getAiConfig()).toEqual({
      enabled: true,
      baseUrl: DEFAULT_AI_BASE_URL,
      apiKey: "test-key",
      model: DEFAULT_AI_MODEL,
    })
  })

  test("disables AI when API key is absent", () => {
    expect(getAiConfig()).toEqual({ enabled: false })
  })
})
