import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/shared/lib/supabase/server", () => ({ getCurrentUser: vi.fn() }))
vi.mock(
  "@/features/rehearsal/server/rehearsal-actions.server",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/features/rehearsal/server/rehearsal-actions.server")
    >()),
    createRehearsal: vi.fn(),
  }),
)

import { createRehearsal, RehearsalActionError } from "@/features/rehearsal/server/rehearsal-actions.server"
import { getCurrentUser } from "@/shared/lib/supabase/server"
import { POST } from "./route"

const session = { id: "session-1", status: "ready" }

function post(body: unknown): Request {
  return new Request("http://localhost/api/rehearsals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never)
  vi.mocked(createRehearsal).mockResolvedValue(session as never)
})

describe("POST /api/rehearsals", () => {
  test("requires authentication", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const response = await POST(
      post({ situation: "Pedir un café", objective: "Pedir una bebida" }),
    )

    expect(response.status).toBe(401)
    expect(createRehearsal).not.toHaveBeenCalled()
  })

  test("rejects invalid input before generating", async () => {
    const response = await POST(post({ situation: "  ", objective: "" }))

    expect(response.status).toBe(400)
    expect(createRehearsal).not.toHaveBeenCalled()
  })

  test("creates a rehearsal for the signed-in account", async () => {
    const response = await POST(
      post({ situation: "Pedir un café", objective: "Pedir una bebida" }),
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ session })
    expect(createRehearsal).toHaveBeenCalledWith("user-1", {
      kind: "new",
      situation: "Pedir un café",
      objective: "Pedir una bebida",
    })
  })

  test("repeats a completed rehearsal from its original", async () => {
    const response = await POST(post({ sourceSessionId: "session-9" }))

    expect(response.status).toBe(201)
    expect(createRehearsal).toHaveBeenCalledWith("user-1", {
      kind: "repeat",
      sourceSessionId: "session-9",
    })
  })

  test("asks for a course band when the account has none", async () => {
    vi.mocked(createRehearsal).mockRejectedValue(
      new RehearsalActionError("course-band-required"),
    )

    const response = await POST(
      post({ situation: "Pedir un café", objective: "Pedir una bebida" }),
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "course-band-required" },
    })
  })

  test("reports exhausted quota", async () => {
    vi.mocked(createRehearsal).mockRejectedValue(
      new RehearsalActionError("daily-limit"),
    )

    const response = await POST(
      post({ situation: "Pedir un café", objective: "Pedir una bebida" }),
    )

    expect(response.status).toBe(429)
  })

  test("reports AI failures without leaking details", async () => {
    vi.mocked(createRehearsal).mockRejectedValue(
      new RehearsalActionError("ai-unavailable"),
    )

    const response = await POST(
      post({ situation: "Pedir un café", objective: "Pedir una bebida" }),
    )

    expect(response.status).toBe(503)
  })

  test("hides unexpected errors", async () => {
    vi.mocked(createRehearsal).mockRejectedValue(new Error("database secret"))

    const response = await POST(
      post({ situation: "Pedir un café", objective: "Pedir una bebida" }),
    )

    expect(response.status).toBe(500)
    await expect(response.text()).resolves.not.toContain("database secret")
  })
})
