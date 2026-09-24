import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))
const tutor = vi.hoisted(() => ({ askTutor: vi.fn(), parseTutorRequest: vi.fn() }))
const usage = vi.hoisted(() => ({
  getAiQuota: vi.fn(),
  recordAiGeneration: vi.fn(),
}))

vi.mock("@/shared/lib/supabase/server", () => auth)
vi.mock("@/features/tutor/server/tutor-service.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/tutor/server/tutor-service.server")>()),
  ...tutor,
}))
vi.mock("@/shared/lib/ai/ai-usage.server", () => usage)

import { POST } from "./route"

const parsedRequest = {
  message: "Why do I say 'I am'?",
  history: [],
  missionSlug: "arrival",
  beatIndex: 0,
}
const reply = {
  explanation: "Usamos be para describir estados.",
  correction: null,
  example: { english: "I am ready.", spanish: "Estoy listo." },
  curiosity: null,
}

function post(body: unknown): Request {
  return new Request("http://localhost/api/tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.getCurrentUser.mockResolvedValue({ id: "user-1" })
  tutor.parseTutorRequest.mockReturnValue(parsedRequest)
  tutor.askTutor.mockResolvedValue({ ok: true, value: reply, model: "test/model" })
  usage.getAiQuota.mockResolvedValue({ used: 4, remaining: 46 })
  usage.recordAiGeneration.mockResolvedValue(true)
})

describe("POST /api/tutor", () => {
  test("requires authentication before reading quota", async () => {
    auth.getCurrentUser.mockResolvedValue(null)

    const response = await POST(post(parsedRequest))

    expect(response.status).toBe(401)
    expect(usage.getAiQuota).not.toHaveBeenCalled()
  })

  test("rejects invalid request before reading quota", async () => {
    tutor.parseTutorRequest.mockReturnValue(null)

    const response = await POST(post({ ...parsedRequest, message: "" }))

    expect(response.status).toBe(400)
    expect(usage.getAiQuota).not.toHaveBeenCalled()
  })

  test("rejects exhausted quota without calling AI", async () => {
    usage.getAiQuota.mockResolvedValue({ used: 50, remaining: 0 })

    const response = await POST(post(parsedRequest))

    expect(response.status).toBe(429)
    expect(tutor.askTutor).not.toHaveBeenCalled()
    expect(usage.recordAiGeneration).not.toHaveBeenCalled()
  })

  test("returns reply and records usage only after successful AI response", async () => {
    const response = await POST(post(parsedRequest))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ reply })
    expect(usage.recordAiGeneration).toHaveBeenCalledOnce()
  })

  test("does not consume quota when AI fails and supports retry", async () => {
    tutor.askTutor.mockResolvedValue({
      ok: false,
      code: "provider-error",
      retryable: true,
    })

    const response = await POST(post(parsedRequest))

    expect(response.status).toBe(503)
    expect(usage.recordAiGeneration).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "ai-unavailable" },
    })
  })

  test("does not return generated reply when concurrent requests use final slot", async () => {
    usage.recordAiGeneration.mockResolvedValue(false)

    const response = await POST(post(parsedRequest))

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "daily-limit" },
    })
  })

  test("hides quota database errors", async () => {
    usage.getAiQuota.mockRejectedValue(new Error("database secret"))

    const response = await POST(post(parsedRequest))

    expect(response.status).toBe(500)
    await expect(response.text()).resolves.not.toContain("database secret")
  })
})
