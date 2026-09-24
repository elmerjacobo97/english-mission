import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/shared/lib/supabase/server", () => ({ getCurrentUser: vi.fn() }))
const repo = vi.hoisted(() => ({ remove: vi.fn() }))
vi.mock("@/features/rehearsal/server/rehearsal-repository.server", () => ({
  createRehearsalRepository: vi.fn().mockResolvedValue(repo),
}))
vi.mock(
  "@/features/rehearsal/server/rehearsal-actions.server",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/features/rehearsal/server/rehearsal-actions.server")
    >()),
    startRehearsal: vi.fn(),
    sendReply: vi.fn(),
    retryGeneration: vi.fn(),
    requestHint: vi.fn(),
    finishRehearsal: vi.fn(),
  }),
)

import {
  finishRehearsal,
  RehearsalActionError,
  requestHint,
  retryGeneration,
  sendReply,
  startRehearsal,
} from "@/features/rehearsal/server/rehearsal-actions.server"
import { getCurrentUser } from "@/shared/lib/supabase/server"
import { DELETE, POST } from "./route"

const session = { id: "session-1", status: "in_progress" }
const context = { params: Promise.resolve({ id: "session-1" }) }

function post(body: unknown): Request {
  return new Request("http://localhost/api/rehearsals/session-1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never)
  vi.mocked(startRehearsal).mockResolvedValue(session as never)
  vi.mocked(sendReply).mockResolvedValue(session as never)
  vi.mocked(retryGeneration).mockResolvedValue(session as never)
  vi.mocked(requestHint).mockResolvedValue(session as never)
  vi.mocked(finishRehearsal).mockResolvedValue(session as never)
})

describe("POST /api/rehearsals/[id]", () => {
  test("requires authentication", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const response = await POST(post({ action: "start" }), context)

    expect(response.status).toBe(401)
    expect(startRehearsal).not.toHaveBeenCalled()
  })

  test("rejects unknown actions and empty replies", async () => {
    expect((await POST(post({ action: "explode" }), context)).status).toBe(400)
    expect((await POST(post({ action: "reply", content: "" }), context)).status).toBe(400)
    expect(sendReply).not.toHaveBeenCalled()
  })

  test("starts a ready rehearsal", async () => {
    const response = await POST(post({ action: "start" }), context)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ session })
    expect(startRehearsal).toHaveBeenCalledWith("user-1", "session-1")
  })

  test("sends a reply with its content", async () => {
    await POST(post({ action: "reply", content: "Hello!" }), context)

    expect(sendReply).toHaveBeenCalledWith("user-1", "session-1", "Hello!")
  })

  test("retries, hints and finishes", async () => {
    await POST(post({ action: "retry" }), context)
    await POST(post({ action: "hint" }), context)
    await POST(post({ action: "finish" }), context)

    expect(retryGeneration).toHaveBeenCalledWith("user-1", "session-1")
    expect(requestHint).toHaveBeenCalledWith("user-1", "session-1")
    expect(finishRehearsal).toHaveBeenCalledWith("user-1", "session-1")
  })

  test("returns the current conversation on conflicts", async () => {
    vi.mocked(sendReply).mockRejectedValue(
      new RehearsalActionError("conflict", session as never),
    )

    const response = await POST(post({ action: "reply", content: "Hi" }), context)

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "conflict" },
      session,
    })
  })

  test("keeps the saved conversation when AI fails", async () => {
    vi.mocked(sendReply).mockRejectedValue(
      new RehearsalActionError("ai-unavailable", session as never),
    )

    const response = await POST(post({ action: "reply", content: "Hi" }), context)

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({ session })
  })

  test("hides unexpected errors", async () => {
    vi.mocked(startRehearsal).mockRejectedValue(new Error("database secret"))

    const response = await POST(post({ action: "start" }), context)

    expect(response.status).toBe(500)
    await expect(response.text()).resolves.not.toContain("database secret")
  })
})

describe("DELETE /api/rehearsals/[id]", () => {
  test("requires authentication", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null)

    const response = await DELETE(new Request("http://localhost"), context)

    expect(response.status).toBe(401)
    expect(repo.remove).not.toHaveBeenCalled()
  })

  test("deletes only the account's own rehearsal", async () => {
    repo.remove.mockResolvedValue(true)

    const response = await DELETE(new Request("http://localhost"), context)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ removed: true })
    expect(repo.remove).toHaveBeenCalledWith("user-1", "session-1")
  })

  test("reports missing rehearsals", async () => {
    repo.remove.mockResolvedValue(false)

    const response = await DELETE(new Request("http://localhost"), context)

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "not-found" },
    })
  })

  test("hides unexpected errors", async () => {
    repo.remove.mockRejectedValue(new Error("database secret"))

    const response = await DELETE(new Request("http://localhost"), context)

    expect(response.status).toBe(500)
    await expect(response.text()).resolves.not.toContain("database secret")
  })
})
