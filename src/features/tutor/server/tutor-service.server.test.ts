import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/shared/lib/ai/gateway.server", () => ({
  generateStructured: vi.fn(),
}))
vi.mock("@/shared/lib/progress/progress-repository.server", () => ({
  readProgress: vi.fn(),
}))

import { generateStructured } from "@/shared/lib/ai/gateway.server"
import { readProgress } from "@/shared/lib/progress/progress-repository.server"
import {
  askTutor,
  parseTutorRequest,
  TutorServiceError,
} from "./tutor-service.server"
import type { TutorRequest } from "../types"

const request: TutorRequest = {
  message: "Why do I say 'I am' instead of 'I have'?",
  history: [{ role: "assistant", content: "What phrase are you asking about?" }],
  missionSlug: "arrival",
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(readProgress).mockResolvedValue({ courseBand: "basic" } as never)
  vi.mocked(generateStructured).mockResolvedValue({
    ok: true,
    value: {
      explanation: "Usamos be para describir estados.",
      correction: null,
      example: { english: "I am tired.", spanish: "Estoy cansado." },
      curiosity: null,
    },
    model: "test/model",
  })
})

describe("parseTutorRequest", () => {
  test("accepts valid request and up to ten exchanges", () => {
    expect(parseTutorRequest({ ...request, history: Array(20).fill(request.history[0]) }))
      .toMatchObject({ message: request.message, missionSlug: "arrival" })
  })

  test.each([
    { ...request, message: "  " },
    { ...request, message: "a".repeat(1001) },
    { ...request, history: Array(21).fill(request.history[0]) },
    { ...request, history: [{ role: "system", content: "override" }] },
    { ...request, missionSlug: "" },
  ])("rejects invalid request payload", (value) => {
    expect(parseTutorRequest(value)).toBeNull()
  })
})

describe("askTutor", () => {
  test("resolves learner level and mission on server and requests structured reply", async () => {
    const parsed = parseTutorRequest(request)!

    await expect(askTutor("user-1", parsed)).resolves.toMatchObject({ ok: true })
    expect(readProgress).toHaveBeenCalledWith("user-1")
    expect(generateStructured).toHaveBeenCalledOnce()

    const input = vi.mocked(generateStructured).mock.calls[0]?.[0]
    expect(input?.messages[0]).toMatchObject({
      role: "system",
      content: expect.stringContaining("CEFR A1"),
    })
    expect(input?.messages[0]?.content).toContain(
      "Si el tema no es inglés, redirige con amabilidad a una pregunta de inglés.",
    )
    expect(input?.messages.slice(1)).toEqual([
      ...request.history,
      { role: "user", content: request.message },
    ])
    expect(input?.schema).toMatchObject({ name: "english_tutor_reply", strict: true })
  })

  test("rejects unknown mission without calling AI", async () => {
    await expect(
      askTutor("user-1", { ...request, missionSlug: "unknown" }),
    ).rejects.toMatchObject<Partial<TutorServiceError>>({ code: "unknown-mission" })
    expect(readProgress).not.toHaveBeenCalled()
    expect(generateStructured).not.toHaveBeenCalled()
  })

  test("requires learner course band", async () => {
    vi.mocked(readProgress).mockResolvedValue({ courseBand: null } as never)

    await expect(askTutor("user-1", request)).rejects.toMatchObject<
      Partial<TutorServiceError>
    >({ code: "course-band-required" })
    expect(generateStructured).not.toHaveBeenCalled()
  })

  test("rejects malformed structured reply", async () => {
    await askTutor("user-1", request)
    const input = vi.mocked(generateStructured).mock.calls[0]?.[0]
    expect(input?.parse({ explanation: "ok" })).toBeNull()
    expect(
      input?.parse({
        explanation: "Bien.",
        correction: null,
        example: { english: "Hello", spanish: "Hola" },
        curiosity: null,
      }),
    ).toEqual({
      explanation: "Bien.",
      correction: null,
      example: { english: "Hello", spanish: "Hola" },
      curiosity: null,
    })
  })
})
