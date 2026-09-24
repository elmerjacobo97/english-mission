import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/shared/lib/ai/ai-usage.server", () => ({
  getAiQuota: vi.fn(),
  recordAiGeneration: vi.fn(),
}))
vi.mock("@/shared/lib/progress/progress-repository.server", () => ({
  readProgress: vi.fn(),
}))

const repo = vi.hoisted(() => ({
  list: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))
const service = vi.hoisted(() => ({
  prepareScenario: vi.fn(),
  continueRehearsal: vi.fn(),
  suggestHint: vi.fn(),
  evaluateRehearsal: vi.fn(),
}))

vi.mock("./rehearsal-repository.server", () => ({
  createRehearsalRepository: vi.fn().mockResolvedValue(repo),
}))
vi.mock("./rehearsal-service.server", () => service)

import { getAiQuota, recordAiGeneration } from "@/shared/lib/ai/ai-usage.server"
import { readProgress } from "@/shared/lib/progress/progress-repository.server"
import type { RehearsalMessage, RehearsalSession } from "../types"
import {
  createRehearsal,
  finishRehearsal,
  requestHint,
  RehearsalActionError,
  retryGeneration,
  sendReply,
  startRehearsal,
} from "./rehearsal-actions.server"

let current: RehearsalSession
let tick: number

function makeSession(overrides: Partial<RehearsalSession> = {}): RehearsalSession {
  return {
    id: "session-1",
    userId: "user-1",
    situation: "Pedir un café en una cafetería",
    objective: "Pedir una bebida y confirmar el precio",
    characterRole: "Barista de una cafetería",
    courseBand: "basic",
    status: "in_progress",
    messages: [{ id: "m1", kind: "character_reply", content: "Hi! What can I get you?" }],
    feedback: null,
    sourceSessionId: null,
    createdAt: "2026-09-23T10:00:00.000Z",
    updatedAt: "2026-09-23T10:00:00.000Z",
    ...overrides,
  }
}

function withReplies(count: number, extra: RehearsalMessage[] = []): RehearsalMessage[] {
  return [
    { id: "m1", kind: "character_reply", content: "Hi!" },
    ...Array.from({ length: count }, (_, index) => ({
      id: `u${index}`,
      kind: "user_reply" as const,
      content: `Reply ${index}`,
    })),
    ...extra,
  ]
}

beforeEach(() => {
  vi.clearAllMocks()
  current = makeSession()
  tick = 10

  vi.mocked(readProgress).mockResolvedValue({ courseBand: "basic" } as never)
  vi.mocked(getAiQuota).mockResolvedValue({ used: 0, remaining: 50 })
  vi.mocked(recordAiGeneration).mockResolvedValue(true)

  repo.find.mockImplementation(async () => current)
  repo.create.mockImplementation(async (_userId: string, input: never) => {
    current = makeSession({
      ...(input as Partial<RehearsalSession>),
      status: "ready",
    })
    return current
  })
  repo.update.mockImplementation(
    async (
      _userId: string,
      _id: string,
      patch: Partial<RehearsalSession>,
      expectedUpdatedAt?: string,
    ) => {
      if (expectedUpdatedAt !== undefined && expectedUpdatedAt !== current.updatedAt) {
        return null
      }
      tick += 1
      current = {
        ...current,
        ...patch,
        updatedAt: `2026-09-23T10:${String(tick).padStart(2, "0")}:00.000Z`,
      }
      return current
    },
  )

  service.prepareScenario.mockResolvedValue({
    ok: true,
    value: {
      characterRole: "Barista de una cafetería",
      objective: "Pedir una bebida y confirmar el precio",
      openingMessage: "Hi! What can I get you?",
    },
    model: "test/model",
  })
  service.continueRehearsal.mockResolvedValue({
    ok: true,
    value: "Sure! Anything else?",
    model: "test/model",
  })
  service.suggestHint.mockResolvedValue({
    ok: true,
    value: { spanish: "Puedes pedir una bebida.", english: "I'd like a coffee, please." },
    model: "test/model",
  })
  service.evaluateRehearsal.mockResolvedValue({
    ok: true,
    value: { outcome: "achieved", explanation: "Lograste el objetivo.", corrections: [] },
    model: "test/model",
  })
})

describe("createRehearsal", () => {
  test("prepares scenario with learner band and stores opening line", async () => {
    const session = await createRehearsal("user-1", {
      kind: "new",
      situation: "Pedir un café",
      objective: "Pedir una bebida",
    })

    expect(service.prepareScenario).toHaveBeenCalledWith({
      situation: "Pedir un café",
      objective: "Pedir una bebida",
      courseBand: "basic",
    })
    expect(recordAiGeneration).toHaveBeenCalledOnce()
    expect(session).toMatchObject({
      status: "ready",
      courseBand: "basic",
      characterRole: "Barista de una cafetería",
      sourceSessionId: null,
    })
    expect(session.messages).toHaveLength(1)
    expect(session.messages[0]).toMatchObject({ kind: "character_reply" })
  })

  test("requires a course band before generating", async () => {
    vi.mocked(readProgress).mockResolvedValue({ courseBand: null } as never)

    await expect(
      createRehearsal("user-1", { kind: "new", situation: "x", objective: "y" }),
    ).rejects.toMatchObject<Partial<RehearsalActionError>>({
      code: "course-band-required",
    })
    expect(service.prepareScenario).not.toHaveBeenCalled()
  })

  test("rejects exhausted quota without calling AI", async () => {
    vi.mocked(getAiQuota).mockResolvedValue({ used: 50, remaining: 0 })

    await expect(
      createRehearsal("user-1", { kind: "new", situation: "x", objective: "y" }),
    ).rejects.toMatchObject<Partial<RehearsalActionError>>({ code: "daily-limit" })
    expect(service.prepareScenario).not.toHaveBeenCalled()
    expect(repo.create).not.toHaveBeenCalled()
  })

  test("does not create a session when scenario generation fails", async () => {
    service.prepareScenario.mockResolvedValue({
      ok: false,
      code: "provider-error",
      retryable: true,
    })

    await expect(
      createRehearsal("user-1", { kind: "new", situation: "x", objective: "y" }),
    ).rejects.toMatchObject<Partial<RehearsalActionError>>({ code: "ai-unavailable" })
    expect(recordAiGeneration).not.toHaveBeenCalled()
    expect(repo.create).not.toHaveBeenCalled()
  })

  test("does not charge the quota when the scenario cannot be stored", async () => {
    repo.create.mockRejectedValueOnce(new Error("database down"))

    await expect(
      createRehearsal("user-1", { kind: "new", situation: "x", objective: "y" }),
    ).rejects.toThrow("database down")
    expect(service.prepareScenario).toHaveBeenCalledOnce()
    expect(recordAiGeneration).not.toHaveBeenCalled()
  })

  test("repeats a completed rehearsal as a variation of the original", async () => {
    const source = makeSession({ status: "completed" })
    current = source

    const session = await createRehearsal("user-1", {
      kind: "repeat",
      sourceSessionId: source.id,
    })

    expect(service.prepareScenario).toHaveBeenCalledWith({
      situation: source.situation,
      objective: source.objective,
      courseBand: "basic",
      variationOf: { characterRole: source.characterRole },
    })
    expect(recordAiGeneration).toHaveBeenCalledOnce()
    expect(session).toMatchObject({
      status: "ready",
      sourceSessionId: source.id,
      situation: source.situation,
    })
  })

  test("rejects repeating a rehearsal that is not completed", async () => {
    current = makeSession({ status: "in_progress" })

    await expect(
      createRehearsal("user-1", { kind: "repeat", sourceSessionId: "session-1" }),
    ).rejects.toMatchObject<Partial<RehearsalActionError>>({
      code: "invalid-status",
    })
    expect(service.prepareScenario).not.toHaveBeenCalled()
  })

  test("rejects repeating a rehearsal from another account", async () => {
    repo.find.mockResolvedValueOnce(null)

    await expect(
      createRehearsal("user-1", { kind: "repeat", sourceSessionId: "session-9" }),
    ).rejects.toMatchObject<Partial<RehearsalActionError>>({ code: "not-found" })
    expect(service.prepareScenario).not.toHaveBeenCalled()
  })
})

describe("startRehearsal", () => {
  test("moves a ready session to in progress without consuming quota", async () => {
    current = makeSession({ status: "ready" })

    await expect(startRehearsal("user-1", "session-1")).resolves.toMatchObject({
      status: "in_progress",
    })
    expect(recordAiGeneration).not.toHaveBeenCalled()
  })

  test("rejects completed sessions", async () => {
    current = makeSession({ status: "completed" })

    await expect(startRehearsal("user-1", "session-1")).rejects.toMatchObject<
      Partial<RehearsalActionError>
    >({ code: "invalid-status" })
  })
})

describe("sendReply", () => {
  test("saves the reply before generating the character continuation", async () => {
    await sendReply("user-1", "session-1", "I'd like a coffee, please.")

    expect(service.continueRehearsal).toHaveBeenCalledOnce()
    expect(recordAiGeneration).toHaveBeenCalledOnce()
    expect(current.messages).toHaveLength(3)
    expect(current.messages[1]).toMatchObject({
      kind: "user_reply",
      content: "I'd like a coffee, please.",
    })
    expect(current.messages[2]).toMatchObject({
      kind: "character_reply",
      content: "Sure! Anything else?",
    })
  })

  test("evaluates instead of continuing after the fifth reply", async () => {
    current = makeSession({
      messages: withReplies(4, [
        { id: "c2", kind: "character_reply", content: "What else?" },
      ]),
    })

    const session = await sendReply("user-1", "session-1", "Fifth reply")

    expect(service.continueRehearsal).not.toHaveBeenCalled()
    expect(service.evaluateRehearsal).toHaveBeenCalledOnce()
    expect(session).toMatchObject({
      status: "completed",
      feedback: { outcome: "achieved" },
    })
  })

  test("blocks a sixth reply without calling AI", async () => {
    current = makeSession({
      messages: withReplies(5, [
        { id: "c2", kind: "character_reply", content: "Thanks!" },
      ]),
    })

    await expect(
      sendReply("user-1", "session-1", "Sixth reply"),
    ).rejects.toMatchObject<Partial<RehearsalActionError>>({ code: "turn-limit" })
    expect(service.continueRehearsal).not.toHaveBeenCalled()
    expect(recordAiGeneration).not.toHaveBeenCalled()
  })

  test("keeps the saved reply when AI fails so the student can retry", async () => {
    service.continueRehearsal.mockResolvedValue({
      ok: false,
      code: "provider-error",
      retryable: true,
    })

    const error = await sendReply("user-1", "session-1", "Hello!").catch(
      (caught: unknown) => caught,
    )

    expect(error).toMatchObject({ code: "ai-unavailable" })
    expect((error as RehearsalActionError).session?.messages).toHaveLength(2)
    expect(recordAiGeneration).not.toHaveBeenCalled()
  })

  test("does not charge the quota when saving the continuation fails", async () => {
    repo.update
      .mockResolvedValueOnce(
        makeSession({
          messages: [
            { id: "m1", kind: "character_reply", content: "Hi!" },
            { id: "u1", kind: "user_reply", content: "Hello!" },
          ],
        }),
      )
      .mockRejectedValueOnce(new Error("database down"))

    await expect(
      sendReply("user-1", "session-1", "Hello!"),
    ).rejects.toThrow("database down")
    expect(service.continueRehearsal).toHaveBeenCalledOnce()
    expect(recordAiGeneration).not.toHaveBeenCalled()
  })

  test("rejects a new reply while the previous generation is pending", async () => {
    current = makeSession({
      messages: [
        { id: "m1", kind: "character_reply", content: "Hi!" },
        { id: "u1", kind: "user_reply", content: "Hello" },
      ],
    })

    await expect(
      sendReply("user-1", "session-1", "Another reply"),
    ).rejects.toMatchObject<Partial<RehearsalActionError>>({
      code: "pending-generation",
    })
    expect(repo.update).not.toHaveBeenCalled()
  })

  test("keeps the saved reply when quota runs out before generating", async () => {
    vi.mocked(getAiQuota).mockResolvedValue({ used: 50, remaining: 0 })

    const error = await sendReply("user-1", "session-1", "Hello!").catch(
      (caught: unknown) => caught,
    )

    expect(error).toMatchObject({ code: "daily-limit" })
    expect((error as RehearsalActionError).session?.messages).toHaveLength(2)
    expect(service.continueRehearsal).not.toHaveBeenCalled()
  })

  test("rejects stale writes from another device without overwriting", async () => {
    repo.update.mockResolvedValueOnce(null)
    current = makeSession({
      messages: [
        { id: "m1", kind: "character_reply", content: "Hi!" },
        { id: "u9", kind: "user_reply", content: "From the other device" },
        { id: "c9", kind: "character_reply", content: "Got it!" },
      ],
    })

    const error = await sendReply("user-1", "session-1", "Hello!").catch(
      (caught: unknown) => caught,
    )

    expect(error).toMatchObject({ code: "conflict" })
    expect((error as RehearsalActionError).session?.messages.at(-1)).toMatchObject({
      content: "Got it!",
    })
  })
})

describe("retryGeneration", () => {
  test("completes a pending generation without adding another reply", async () => {
    current = makeSession({
      messages: [
        { id: "m1", kind: "character_reply", content: "Hi!" },
        { id: "u1", kind: "user_reply", content: "Hello" },
      ],
    })

    const session = await retryGeneration("user-1", "session-1")

    expect(service.continueRehearsal).toHaveBeenCalledOnce()
    expect(session.messages.filter((item) => item.kind === "user_reply")).toHaveLength(1)
    expect(session.messages.at(-1)).toMatchObject({
      kind: "character_reply",
      content: "Sure! Anything else?",
    })
  })

  test("generates pending feedback after a failed fifth-reply evaluation", async () => {
    current = makeSession({ messages: withReplies(5) })

    const session = await retryGeneration("user-1", "session-1")

    expect(service.evaluateRehearsal).toHaveBeenCalledOnce()
    expect(session).toMatchObject({ status: "completed" })
  })

  test("rejects retries when nothing is pending", async () => {
    await expect(retryGeneration("user-1", "session-1")).rejects.toMatchObject<
      Partial<RehearsalActionError>
    >({ code: "no-pending-generation" })
  })
})

describe("requestHint", () => {
  test("stores the hint without consuming a turn", async () => {
    current = makeSession({
      messages: [
        { id: "m1", kind: "character_reply", content: "Hi!" },
        { id: "u1", kind: "user_reply", content: "Hello" },
        { id: "c1", kind: "character_reply", content: "How can I help?" },
      ],
    })

    const session = await requestHint("user-1", "session-1")

    expect(recordAiGeneration).toHaveBeenCalledOnce()
    expect(session.messages.filter((item) => item.kind === "user_reply")).toHaveLength(1)
    expect(session.messages.at(-1)).toMatchObject({ kind: "hint" })
    expect(session.messages.at(-1)?.content).toContain("I'd like a coffee, please.")
  })

  test("does not charge the hint when saving it fails", async () => {
    repo.update.mockRejectedValueOnce(new Error("database down"))

    await expect(requestHint("user-1", "session-1")).rejects.toThrow(
      "database down",
    )
    expect(service.suggestHint).toHaveBeenCalledOnce()
    expect(recordAiGeneration).not.toHaveBeenCalled()
  })
})

describe("finishRehearsal", () => {
  test("closes early without evidence and without calling AI", async () => {
    const session = await finishRehearsal("user-1", "session-1")

    expect(session).toMatchObject({
      status: "completed",
      feedback: { outcome: "insufficient_evidence", corrections: [] },
    })
    expect(service.evaluateRehearsal).not.toHaveBeenCalled()
    expect(recordAiGeneration).not.toHaveBeenCalled()
  })

  test("evaluates the conversation when there are replies", async () => {
    current = makeSession({ messages: withReplies(2) })

    const session = await finishRehearsal("user-1", "session-1")

    expect(service.evaluateRehearsal).toHaveBeenCalledOnce()
    expect(session).toMatchObject({
      status: "completed",
      feedback: { outcome: "achieved" },
    })
  })

  test("keeps the conversation open when evaluation fails", async () => {
    current = makeSession({ messages: withReplies(2) })
    service.evaluateRehearsal.mockResolvedValue({
      ok: false,
      code: "provider-error",
      retryable: true,
    })

    await expect(finishRehearsal("user-1", "session-1")).rejects.toMatchObject<
      Partial<RehearsalActionError>
    >({ code: "ai-unavailable" })
    expect(current.status).toBe("in_progress")
    expect(current.feedback).toBeNull()
  })
})
