import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import type { VideoLibraryItem } from "../utils/video"
import { useVideoLibrary } from "./use-video-library"

const video: VideoLibraryItem = {
  videoId: "dQw4w9WgXcQ",
  url: "https://youtu.be/dQw4w9WgXcQ",
  title: "A video",
  thumbnailUrl: null,
  language: "en",
  segments: [{ text: "Hello", startMs: 0, durationMs: 1000 }],
  positionMs: 0,
  createdAt: "2026-09-22T00:00:00.000Z",
  updatedAt: "2026-09-22T00:00:00.000Z",
}

const fetchMock = vi.fn()

function response(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  } as unknown as Response
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useVideoLibrary", () => {
  test("rejects invalid URL before making a request", async () => {
    const { result } = renderHook(() => useVideoLibrary([]))

    let processed: unknown
    await act(async () => {
      processed = await result.current.processVideo("not a YouTube URL")
    })

    expect(processed).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.error).toEqual({
      code: "invalid-url",
      message: "Pega una URL válida de YouTube.",
    })
  })

  test("processes and opens a newly saved video", async () => {
    fetchMock.mockResolvedValueOnce(
      response({ video, reused: false }, 201),
    )
    const { result } = renderHook(() => useVideoLibrary([]))

    await act(async () => {
      await result.current.processVideo(video.url)
    })

    expect(result.current.videos).toEqual([video])
    expect(result.current.selectedVideo).toEqual(video)
    expect(result.current.error).toBeNull()
  })

  test("reuses saved video response without changing library size", async () => {
    fetchMock.mockResolvedValueOnce(response({ video, reused: true }))
    const { result } = renderHook(() => useVideoLibrary([video]))

    let processed: unknown
    await act(async () => {
      processed = await result.current.processVideo(video.url)
    })

    expect(processed).toEqual({ video, reused: true })
    expect(result.current.videos).toHaveLength(1)
    expect(result.current.selectedVideoId).toBe(video.videoId)
  })

  test("reloads library after a failed initial server read", async () => {
    const nextVideo = { ...video, title: "Loaded later" }
    fetchMock.mockResolvedValueOnce(response({ videos: [nextVideo] }))
    const { result } = renderHook(() => useVideoLibrary([]))

    await act(async () => {
      await result.current.reload()
    })

    expect(result.current.videos).toEqual([nextVideo])
  })

  test("deletes a video and closes it when it is selected", async () => {
    fetchMock.mockResolvedValueOnce(response({ video }))
    const { result } = renderHook(() => useVideoLibrary([video]))
    act(() => result.current.openVideo(video.videoId))

    await act(async () => {
      await result.current.deleteVideo(video.videoId)
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/videos/${video.videoId}`,
      { method: "DELETE" },
    )
    expect(result.current.videos).toEqual([])
    expect(result.current.selectedVideo).toBeNull()
  })

  test("keeps controlled API error message", async () => {
    fetchMock.mockResolvedValueOnce(
      response(
        { error: { code: "daily-limit", message: "Límite alcanzado." } },
        429,
      ),
    )
    const { result } = renderHook(() => useVideoLibrary([]))

    await act(async () => {
      await result.current.processVideo(video.url)
    })

    expect(result.current.error).toEqual({
      code: "daily-limit",
      message: "Límite alcanzado.",
    })
  })
})
