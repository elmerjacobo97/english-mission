import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))
const repository = vi.hoisted(() => ({ createVideoRepository: vi.fn() }))

vi.mock("@/shared/lib/supabase/server", () => auth)
vi.mock("@/features/videos/server/video-repository.server", () => repository)

import { PATCH } from "./route"

const video = {
  videoId: "dQw4w9WgXcQ",
  url: "https://youtu.be/dQw4w9WgXcQ",
  title: "A video",
  thumbnailUrl: null,
  language: "en" as const,
  segments: [{ text: "Hello", startMs: 0, durationMs: 1000 }],
  positionMs: 500,
  createdAt: "2026-09-22T00:00:00.000Z",
  updatedAt: "2026-09-22T00:00:00.000Z",
}

function context() {
  return { params: Promise.resolve({ videoId: video.videoId }) }
}

function request(body?: unknown) {
  return new Request("http://localhost:3000/api/videos/dQw4w9WgXcQ/position", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

function mockRepository(overrides = {}) {
  const value = {
    updatePosition: vi.fn().mockResolvedValue(video),
    ...overrides,
  }
  repository.createVideoRepository.mockResolvedValue(value)
  return value
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.getCurrentUser.mockResolvedValue({ id: "user-1" })
  mockRepository()
})

describe("PATCH /api/videos/[videoId]/position", () => {
  test("requires authentication", async () => {
    auth.getCurrentUser.mockResolvedValue(null)

    const response = await PATCH(request({ positionMs: 500 }), context())

    expect(response.status).toBe(401)
  })

  test("updates position for current user's video", async () => {
    const repo = mockRepository()

    const response = await PATCH(request({ positionMs: 500 }), context())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ video })
    expect(repo.updatePosition).toHaveBeenCalledWith(
      "user-1",
      video.videoId,
      500,
      expect.any(String),
    )
  })

  test("returns not-found when video does not exist", async () => {
    mockRepository({ updatePosition: vi.fn().mockResolvedValue(null) })

    const response = await PATCH(request({ positionMs: 500 }), context())

    expect(response.status).toBe(404)
  })

  test.each([
    undefined,
    { positionMs: -1 },
    { positionMs: 1.5 },
    { positionMs: "500" },
  ])("rejects invalid position %s", async (body) => {
    const response = await PATCH(request(body), context())

    expect(response.status).toBe(400)
  })
})
