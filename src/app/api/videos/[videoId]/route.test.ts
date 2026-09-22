import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))
const repository = vi.hoisted(() => ({ createVideoRepository: vi.fn() }))

vi.mock("@/shared/lib/supabase/server", () => auth)
vi.mock("@/features/videos/server/video-repository.server", () => repository)

import { DELETE } from "./route"

const video = {
  videoId: "dQw4w9WgXcQ",
  url: "https://youtu.be/dQw4w9WgXcQ",
  title: "A video",
  thumbnailUrl: null,
  language: "en" as const,
  segments: [{ text: "Hello", startMs: 0, durationMs: 1000 }],
  positionMs: 0,
  createdAt: "2026-09-22T00:00:00.000Z",
  updatedAt: "2026-09-22T00:00:00.000Z",
}

function context(videoId = video.videoId) {
  return { params: Promise.resolve({ videoId }) }
}

function mockRepository(overrides = {}) {
  const value = {
    delete: vi.fn().mockResolvedValue(video),
    updatePosition: vi.fn().mockResolvedValue({ ...video, positionMs: 500 }),
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

describe("/api/videos/[videoId]", () => {
  test("requires authentication for delete", async () => {
    auth.getCurrentUser.mockResolvedValue(null)

    await expect(DELETE(new Request("http://localhost"), context())).resolves.toMatchObject({
      status: 401,
    })
  })

  test("deletes own video", async () => {
    const repo = mockRepository()

    const response = await DELETE(new Request("http://localhost"), context())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ video })
    expect(repo.delete).toHaveBeenCalledWith("user-1", video.videoId)
  })

  test("returns not-found when delete matches no video", async () => {
    mockRepository({ delete: vi.fn().mockResolvedValue(null) })

    const response = await DELETE(new Request("http://localhost"), context())

    expect(response.status).toBe(404)
  })

  test("rejects malformed video id", async () => {
    const response = await DELETE(
      new Request("http://localhost"),
      context("not-a-video-id"),
    )

    expect(response.status).toBe(400)
  })
})
