import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

const auth = vi.hoisted(() => ({ getCurrentUser: vi.fn() }))
const repository = vi.hoisted(() => ({ createVideoRepository: vi.fn() }))
const transcript = vi.hoisted(() => ({
  fetchTranscript: vi.fn(),
  isTranscriptProviderConfigured: vi.fn(),
}))
const metadata = vi.hoisted(() => ({ fetchYouTubeMetadata: vi.fn() }))

vi.mock("@/shared/lib/supabase/server", () => auth)
vi.mock("@/features/videos/server/video-repository.server", () => repository)
vi.mock("@/features/videos/server/transcript-provider.server", () => transcript)
vi.mock("@/features/videos/server/video-metadata.server", () => metadata)

import { POST } from "./route"

const savedVideo = {
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

function request(body: unknown) {
  return new Request("http://localhost:3000/api/videos/process", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

function mockRepository(overrides = {}) {
  const value = {
    find: vi.fn().mockResolvedValue(null),
    claimProcessing: vi.fn().mockResolvedValue({
      status: "claimed",
      claimToken: "claim-token-1",
    }),
    releaseProcessing: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(savedVideo),
    ...overrides,
  }
  repository.createVideoRepository.mockResolvedValue(value)
  return value
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.getCurrentUser.mockResolvedValue({ id: "user-1" })
  transcript.isTranscriptProviderConfigured.mockReturnValue(true)
  transcript.fetchTranscript.mockResolvedValue({
    ok: true,
    value: {
      language: "en",
      segments: [{ text: "Hello", startMs: 0, durationMs: 1000 }],
    },
  })
  metadata.fetchYouTubeMetadata.mockResolvedValue({
    title: "A video",
    thumbnailUrl: null,
  })
  mockRepository()
})

describe("POST /api/videos/process", () => {
  test("requires an authenticated user", async () => {
    auth.getCurrentUser.mockResolvedValue(null)

    const response = await POST(request({ url: "https://youtu.be/dQw4w9WgXcQ" }))

    expect(response.status).toBe(401)
    expect(repository.createVideoRepository).not.toHaveBeenCalled()
  })

  test("rejects invalid URL without calling provider", async () => {
    const response = await POST(request({ url: "https://example.com/video" }))

    expect(response.status).toBe(400)
    expect(transcript.fetchTranscript).not.toHaveBeenCalled()
  })

  test("reports missing provider configuration", async () => {
    transcript.isTranscriptProviderConfigured.mockReturnValue(false)

    const response = await POST(request({ url: savedVideo.url }))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "provider-not-configured",
        message:
          "El servicio de transcript no está configurado. Define TRANSCRIPT_API_KEY y reinicia el servidor.",
      },
    })
    expect(repository.createVideoRepository).toHaveBeenCalled()
    expect(transcript.fetchTranscript).not.toHaveBeenCalled()
  })

  test("reopens duplicate without quota or provider call", async () => {
    mockRepository({ find: vi.fn().mockResolvedValue(savedVideo) })

    const response = await POST(request({ url: savedVideo.url }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      video: savedVideo,
      reused: true,
    })
    expect(transcript.fetchTranscript).not.toHaveBeenCalled()
    expect(repository.createVideoRepository.mock.results[0]).toBeDefined()
  })

  test("blocks a full library before calling the provider", async () => {
    const repo = mockRepository({
      claimProcessing: vi.fn().mockResolvedValue({
        status: "library-full",
        claimToken: null,
      }),
    })

    const response = await POST(request({ url: savedVideo.url }))

    expect(response.status).toBe(409)
    expect(repo.claimProcessing).toHaveBeenCalledWith("user-1", savedVideo.videoId)
  })

  test("does not process a video already being claimed", async () => {
    const repo = mockRepository({
      claimProcessing: vi.fn().mockResolvedValue({
        status: "processing",
        claimToken: null,
      }),
    })

    const response = await POST(request({ url: savedVideo.url }))

    expect(response.status).toBe(409)
    expect(transcript.fetchTranscript).not.toHaveBeenCalled()
    expect(repo.save).not.toHaveBeenCalled()
  })

  test("processes, enriches, and stores a new video", async () => {
    const response = await POST(request({ url: `  ${savedVideo.url}  ` }))

    expect(response.status).toBe(201)
    expect(transcript.fetchTranscript).toHaveBeenCalledWith(savedVideo.url)
    expect(metadata.fetchYouTubeMetadata).toHaveBeenCalledWith(
      savedVideo.url,
      savedVideo.videoId,
    )
    expect(response.headers.get("content-type")).toContain("application/json")
    await expect(response.json()).resolves.toMatchObject({
      video: savedVideo,
      reused: false,
    })
  })

  test.each([
    ["unsupported-language", 422],
    ["transcript-unavailable", 422],
    ["rate-limited", 429],
    ["unauthorized", 503],
    ["payment-required", 402],
    ["provider-error", 503],
  ] as const)("maps provider %s to controlled response", async (code, status) => {
    transcript.fetchTranscript.mockResolvedValueOnce({
      ok: false,
      code,
      retryable: false,
    })

    const response = await POST(request({ url: savedVideo.url }))

    expect(response.status).toBe(status)
    expect(repository.createVideoRepository.mock.results[0]).toBeDefined()
  })
})
