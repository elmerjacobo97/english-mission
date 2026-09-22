import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}))

import { createSupabaseServerClient } from "@/shared/lib/supabase/server"
import {
  createVideoRepository,
  VideoRepositoryError,
} from "./video-repository.server"

const video = {
  videoId: "dQw4w9WgXcQ",
  url: "https://youtu.be/dQw4w9WgXcQ",
  title: "Test video",
  thumbnailUrl: "https://example.test/thumb.jpg",
  language: "en" as const,
  segments: [{ text: "Hello", startMs: 0, durationMs: 1000 }],
  positionMs: 0,
  createdAt: "2026-09-22T00:00:00.000Z",
  updatedAt: "2026-09-22T00:00:00.000Z",
}

const row = {
  user_id: "user-1",
  video_id: video.videoId,
  url: video.url,
  title: video.title,
  thumbnail_url: video.thumbnailUrl,
  language: "en",
  segments: video.segments,
  position_ms: video.positionMs,
  created_at: video.createdAt,
  updated_at: video.updatedAt,
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
  const client = {
    from: vi.fn(),
    rpc: vi.fn(),
  }

  for (const query of queries) {
    client.from.mockReturnValueOnce(query)
  }
  vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)
  return client
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createVideoRepository", () => {
  test("lists and maps stored videos", async () => {
    const query = builder({ data: [row], error: null })
    mockClient(query)
    const repository = await createVideoRepository()

    await expect(repository.list("user-1")).resolves.toEqual([video])
    expect(query.order).toHaveBeenCalledWith("updated_at", { ascending: false })
  })

  test("finds one video by user and video id", async () => {
    const query = builder({ data: row, error: null })
    mockClient(query)
    const repository = await createVideoRepository()

    await expect(repository.find("user-1", video.videoId)).resolves.toEqual(video)
    expect(query.eq).toHaveBeenCalledWith("video_id", video.videoId)
  })

  test("blocks saving when library reaches twenty videos", async () => {
    const client = mockClient()
    client.rpc.mockResolvedValue({
      data: null,
      error: { message: "video_library_full" },
    })
    const repository = await createVideoRepository()

    await expect(
      repository.save("user-1", video, "claim-token-1"),
    ).rejects.toMatchObject<
      Partial<VideoRepositoryError>
    >({ code: "library-full" })
    expect(client.rpc).toHaveBeenCalledWith(
      "save_video_library",
      expect.objectContaining({ p_video_id: video.videoId }),
    )
  })

  test("saves a video after capacity check", async () => {
    const client = mockClient()
    client.rpc.mockResolvedValue({ data: row, error: null })
    const repository = await createVideoRepository()

    await expect(
      repository.save("user-1", video, "claim-token-1"),
    ).resolves.toEqual(video)
    expect(client.rpc).toHaveBeenCalledWith("save_video_library", {
      p_video_id: video.videoId,
      p_url: video.url,
      p_title: video.title,
      p_thumbnail_url: video.thumbnailUrl,
      p_language: video.language,
      p_segments: video.segments,
      p_position_ms: 0,
      p_created_at: video.createdAt,
      p_updated_at: video.updatedAt,
      p_claim_token: "claim-token-1",
    })
  })

  test("claims duplicate, capacity, and quota through atomic database function", async () => {
    const client = mockClient()
    client.rpc.mockResolvedValue({
      data: { status: "claimed", claimToken: "claim-token-1" },
      error: null,
    })
    const repository = await createVideoRepository()

    await expect(
      repository.claimProcessing("user-1", video.videoId),
    ).resolves.toEqual({ status: "claimed", claimToken: "claim-token-1" })
    expect(client.rpc).toHaveBeenCalledWith("claim_video_processing", {
      p_video_id: video.videoId,
    })
  })

  test("deletes and updates position for own video", async () => {
    const updatedRow = { ...row, position_ms: 500 }
    const client = mockClient()
    client.rpc
      .mockResolvedValueOnce({ data: row, error: null })
      .mockResolvedValueOnce({ data: updatedRow, error: null })
    const repository = await createVideoRepository()

    await expect(repository.delete("user-1", video.videoId)).resolves.toEqual(video)
    await expect(
      repository.updatePosition("user-1", video.videoId, 500),
    ).resolves.toMatchObject({ positionMs: 500 })
    expect(client.rpc).toHaveBeenNthCalledWith(1, "delete_video_library", {
      p_video_id: video.videoId,
    })
    expect(client.rpc).toHaveBeenNthCalledWith(2, "update_video_position", {
      p_video_id: video.videoId,
      p_position_ms: 500,
      p_client_updated_at: expect.any(String),
    })
  })
})
