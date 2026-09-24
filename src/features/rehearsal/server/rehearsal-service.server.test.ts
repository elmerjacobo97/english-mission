import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/shared/lib/ai/gateway.server", () => ({
  generateStructured: vi.fn(),
}))

import { generateStructured } from "@/shared/lib/ai/gateway.server"
import type { RehearsalFeedback, RehearsalSession } from "../types"
import {
  continueRehearsal,
  evaluateRehearsal,
  prepareScenario,
  suggestHint,
} from "./rehearsal-service.server"

const session: RehearsalSession = {
  id: "session-1",
  userId: "user-1",
  situation: "Pedir un café en una cafetería de Nueva York",
  objective: "Pedir una bebida y confirmar el precio",
  characterRole: "Barista de una cafetería",
  courseBand: "basic",
  status: "in_progress",
  messages: [
    { id: "message-1", kind: "character_reply", content: "Hi! What can I get you?" },
    { id: "message-2", kind: "hint", content: "Puedes decir: I'd like a coffee, please." },
    { id: "message-3", kind: "user_reply", content: "I'd like a coffee, please." },
  ],
  feedback: null,
  sourceSessionId: null,
  createdAt: "2026-09-23T10:00:00.000Z",
  updatedAt: "2026-09-23T10:05:00.000Z",
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(generateStructured).mockResolvedValue({
    ok: true,
    value: "Sure! Anything else?",
    model: "test/model",
  })
})

describe("prepareScenario", () => {
  test("asks for scenario, confirmed objective and opening line at learner band", async () => {
    await prepareScenario({
      situation: session.situation,
      objective: session.objective,
      courseBand: "basic",
    })

    const input = vi.mocked(generateStructured).mock.calls[0]?.[0]
    expect(input?.messages[0]?.content).toContain("frases cortas")
    expect(input?.messages[1]).toMatchObject({
      role: "user",
      content: expect.stringContaining(session.objective),
    })
    expect(input?.schema).toMatchObject({
      name: "english_rehearsal_scenario",
      strict: true,
    })
    expect(
      input?.parse({
        characterRole: "Barista",
        objective: "Pedir un café",
        openingMessage: "Hi! What can I get you?",
      }),
    ).toEqual({
      characterRole: "Barista",
      objective: "Pedir un café",
      openingMessage: "Hi! What can I get you?",
    })
    expect(input?.parse({ characterRole: "Barista" })).toBeNull()
  })
})

describe("continueRehearsal", () => {
  test("keeps character role and sends transcript without hints", async () => {
    await continueRehearsal(session)

    const input = vi.mocked(generateStructured).mock.calls[0]?.[0]
    expect(input?.messages[0]?.content).toContain("Barista de una cafetería")
    expect(input?.messages[0]?.content).toContain(session.objective)
    expect(input?.messages[0]?.content).toContain("No corrijas errores")
    expect(input?.messages.slice(1)).toEqual([
      { role: "assistant", content: "Hi! What can I get you?" },
      { role: "user", content: "I'd like a coffee, please." },
    ])
    expect(input?.parse({ reply: "Sure!" })).toBe("Sure!")
    expect(input?.parse({ reply: "  " })).toBeNull()
  })
})

describe("suggestHint", () => {
  test("requests Spanish help plus English starter without continuing the scene", async () => {
    await suggestHint(session)

    const input = vi.mocked(generateStructured).mock.calls[0]?.[0]
    expect(input?.messages[0]?.content).toContain("No continúes la conversación")
    expect(input?.messages.at(-1)).toMatchObject({ role: "user" })
    expect(input?.schema).toMatchObject({ name: "english_rehearsal_hint" })
    expect(
      input?.parse({ spanish: "Puedes pedir una bebida.", english: "I'd like a tea, please." }),
    ).toEqual({
      spanish: "Puedes pedir una bebida.",
      english: "I'd like a tea, please.",
    })
    expect(input?.parse({ spanish: "Puedes pedir una bebida." })).toBeNull()
  })
})

describe("evaluateRehearsal", () => {
  test("evaluates objective from student replies and caps corrections at two", async () => {
    await evaluateRehearsal(session)

    const input = vi.mocked(generateStructured).mock.calls[0]?.[0]
    expect(input?.messages[0]?.content).toContain("Objetivo del estudiante")
    expect(input?.schema).toMatchObject({ name: "english_rehearsal_feedback" })

    const parsed = input?.parse({
      outcome: "partially_achieved",
      explanation: "Pediste la bebida, pero no confirmaste el precio.",
      corrections: [
        { original: "I want coffee", corrected: "I'd like a coffee", reason: "Suena más natural." },
        { original: "How much cost?", corrected: "How much is it?", reason: "Orden correcto." },
        { original: "extra", corrected: "extra", reason: "extra" },
      ],
    }) as RehearsalFeedback | null

    expect(parsed).toMatchObject({ outcome: "partially_achieved" })
    expect(parsed?.corrections).toHaveLength(2)
    expect(
      input?.parse({
        outcome: "unknown",
        explanation: "x",
        corrections: [],
      }),
    ).toBeNull()
  })
})
