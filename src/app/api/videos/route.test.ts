import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))
const repository = vi.hoisted(() => ({ createVideoRepository: vi.fn() }))

vi.mock("@/shared/lib/supabase/server", () => auth)
vi.mock("@/features/videos/server/video-repository.server", () => repository)

import { GET } from "./route"

const videos = [
  {
    videoId: "dQw4w9WgXcQ",
    url: "https://youtu.be/dQw4w9WgXcQ",
    title: "A video",
    thumbnailUrl: null,
    language: "en" as const,
    segments: [{ text: "Hello", startMs: 0, durationMs: 1000 }],
    positionMs: 0,
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z",
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  auth.getCurrentUser.mockResolvedValue({ id: "user-1" })
  repository.createVideoRepository.mockResolvedValue({
    list: vi.fn().mockResolvedValue(videos),
  })
})

describe("GET /api/videos", () => {
  test("requires authentication", async () => {
    auth.getCurrentUser.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
    expect(repository.createVideoRepository).not.toHaveBeenCalled()
  })

  test("lists current user's videos", async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ videos })
    expect(repository.createVideoRepository).toHaveBeenCalledOnce()
  })

  test("hides repository errors", async () => {
    repository.createVideoRepository.mockRejectedValueOnce(
      new Error("database secret"),
    )

    const response = await GET()

    expect(response.status).toBe(500)
    await expect(response.text()).resolves.not.toContain("database secret")
  })
})
