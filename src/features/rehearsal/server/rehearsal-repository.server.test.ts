import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}))

import { createSupabaseServerClient } from "@/shared/lib/supabase/server"
import type { RehearsalMessage } from "../types"
import { createRehearsalRepository } from "./rehearsal-repository.server"

const sessionRow = {
  id: "session-1",
  user_id: "user-1",
  situation: "Pedir un café en una cafetería de Nueva York",
  objective: "Pedir una bebida y confirmar el precio",
  character_role: "Barista de una cafetería",
  course_band: "basic",
  status: "in_progress",
  messages: [
    { id: "message-1", kind: "character_reply", content: "Hi! What can I get you?" },
    { id: "message-2", kind: "hint", content: "Puedes decir: I'd like a coffee, please." },
    { id: "message-3", kind: "user_reply", content: "I'd like a coffee, please." },
  ] satisfies RehearsalMessage[],
  feedback: null,
  source_session_id: null,
  created_at: "2026-09-23T10:00:00.000Z",
  updated_at: "2026-09-23T10:05:00.000Z",
}

const session = {
  id: "session-1",
  userId: "user-1",
  situation: sessionRow.situation,
  objective: sessionRow.objective,
  characterRole: sessionRow.character_role,
  courseBand: "basic" as const,
  status: "in_progress" as const,
  messages: sessionRow.messages,
  feedback: null,
  sourceSessionId: null,
  createdAt: sessionRow.created_at,
  updatedAt: sessionRow.updated_at,
}

function builder(result: unknown) {
  const query = {
    delete: vi.fn(),
    eq: vi.fn(),
    insert: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    order: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
    then: (onFulfilled: (value: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
    update: vi.fn(),
  }

  query.delete.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.insert.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.select.mockReturnValue(query)
  query.update.mockReturnValue(query)

  return query
}

function mockClient(...queries: ReturnType<typeof builder>[]) {
  const client = { from: vi.fn() }

  for (const query of queries) {
    client.from.mockReturnValueOnce(query)
  }
  vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)
  return client
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createRehearsalRepository", () => {
  test("lists own sessions by recent activity", async () => {
    const query = builder({ data: [sessionRow], error: null })
    mockClient(query)
    const repository = await createRehearsalRepository()

    await expect(repository.list("user-1")).resolves.toEqual([session])
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1")
    expect(query.order).toHaveBeenCalledWith("updated_at", { ascending: false })
  })

  test("finds one session scoped to its owner", async () => {
    const query = builder({ data: sessionRow, error: null })
    mockClient(query)
    const repository = await createRehearsalRepository()

    await expect(repository.find("user-1", "session-1")).resolves.toEqual(
      session,
    )
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1")
    expect(query.eq).toHaveBeenCalledWith("id", "session-1")
  })

  test("creates a session from scenario input", async () => {
    const query = builder({ data: sessionRow, error: null })
    mockClient(query)
    const repository = await createRehearsalRepository()

    await expect(
      repository.create("user-1", {
        situation: sessionRow.situation,
        objective: sessionRow.objective,
        characterRole: sessionRow.character_role,
        courseBand: "basic",
        messages: sessionRow.messages,
        sourceSessionId: null,
      }),
    ).resolves.toEqual(session)
    expect(query.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      situation: sessionRow.situation,
      objective: sessionRow.objective,
      character_role: sessionRow.character_role,
      course_band: "basic",
      messages: sessionRow.messages,
      source_session_id: null,
    })
  })

  test("updates only when the stored version still matches", async () => {
    const updatedRow = {
      ...sessionRow,
      messages: [
        ...sessionRow.messages,
        { id: "message-4", kind: "character_reply" as const, content: "Sure!" },
      ],
      updated_at: "2026-09-23T10:06:00.000Z",
    }
    const query = builder({ data: updatedRow, error: null })
    mockClient(query)
    const repository = await createRehearsalRepository()

    await expect(
      repository.update(
        "user-1",
        "session-1",
        { messages: updatedRow.messages },
        sessionRow.updated_at,
      ),
    ).resolves.toMatchObject({ updatedAt: updatedRow.updated_at })
    expect(query.eq).toHaveBeenCalledWith("updated_at", sessionRow.updated_at)
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ messages: updatedRow.messages }),
    )
  })

  test("returns null when a stale version cannot be updated", async () => {
    const query = builder({ data: null, error: null })
    mockClient(query)
    const repository = await createRehearsalRepository()

    await expect(
      repository.update(
        "user-1",
        "session-1",
        { status: "completed" },
        "2026-09-23T09:00:00.000Z",
      ),
    ).resolves.toBeNull()
  })

  test("reads repetitions with a null source after the original is deleted", async () => {
    const repetitionRow = {
      ...sessionRow,
      id: "session-2",
      source_session_id: null,
      feedback: {
        outcome: "achieved",
        explanation: "Lograste pedir la bebida y confirmar el precio.",
        corrections: [],
      },
    }
    const query = builder({ data: repetitionRow, error: null })
    mockClient(query)
    const repository = await createRehearsalRepository()

    await expect(repository.find("user-1", "session-2")).resolves.toMatchObject({
      id: "session-2",
      sourceSessionId: null,
      feedback: { outcome: "achieved" },
    })
  })

  test("deletes only own sessions and reports whether a row was removed", async () => {
    const deleted = builder({ data: [{ id: "session-1" }], error: null })
    const missing = builder({ data: [], error: null })
    mockClient(deleted, missing)
    const repository = await createRehearsalRepository()

    await expect(repository.remove("user-1", "session-1")).resolves.toBe(true)
    await expect(repository.remove("user-2", "session-1")).resolves.toBe(false)
    expect(deleted.eq).toHaveBeenCalledWith("user_id", "user-1")
    expect(missing.eq).toHaveBeenCalledWith("user_id", "user-2")
  })

  test("rejects stored sessions with an invalid shape", async () => {
    const query = builder({
      data: { ...sessionRow, feedback: { outcome: "unknown" } },
      error: null,
    })
    mockClient(query)
    const repository = await createRehearsalRepository()

    await expect(repository.find("user-1", "session-1")).rejects.toThrow(
      "invalid shape",
    )
  })

  test("surfaces database errors", async () => {
    const query = builder({ data: null, error: { message: "boom" } })
    mockClient(query)
    const repository = await createRehearsalRepository()

    await expect(repository.list("user-1")).rejects.toThrow(
      "Could not list rehearsal sessions: boom",
    )
  })
})
