import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import type { YouTubePlayerController } from "../components/youtube-player"
import type { VideoLibraryItem } from "../utils/video"
import { useVideoSession } from "./use-video-session"

const video: VideoLibraryItem = {
  videoId: "dQw4w9WgXcQ",
  url: "https://youtu.be/dQw4w9WgXcQ",
  title: "A video",
  thumbnailUrl: null,
  language: "en",
  segments: [
    { text: "First", startMs: 0, durationMs: 1000 },
    { text: "Second", startMs: 1000, durationMs: 1000 },
  ],
  positionMs: 1000,
  createdAt: "2026-09-22T00:00:00.000Z",
  updatedAt: "2026-09-22T00:00:00.000Z",
}

const controller: YouTubePlayerController = {
  play: vi.fn(),
  pause: vi.fn(),
  seekTo: vi.fn(),
  getCurrentTimeMs: vi.fn(() => 1000),
}

const fetchMock = vi.fn().mockResolvedValue({ ok: true })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useVideoSession", () => {
  test("restores saved position and tracks active segment", () => {
    const { result } = renderHook(() => useVideoSession(video))

    expect(result.current.activeSegmentIndex).toBe(1)

    act(() => result.current.handlePlayerReady(controller))

    expect(controller.seekTo).toHaveBeenCalledWith(1000)
    expect(result.current.positionRestored).toBe(true)

    act(() => result.current.handleTimeUpdate(0))

    expect(result.current.currentTimeMs).toBe(0)
    expect(result.current.activeSegmentIndex).toBe(0)
  })

  test("seeks selected segment without starting playback", () => {
    const { result } = renderHook(() => useVideoSession(video))

    act(() => result.current.handlePlayerReady(controller))
    act(() => result.current.selectSegment(video.segments[0]))

    expect(controller.seekTo).toHaveBeenLastCalledWith(0)
    expect(controller.play).not.toHaveBeenCalled()
    expect(result.current.currentTimeMs).toBe(0)
  })

  test("saves position when player pauses", async () => {
    const { result } = renderHook(() => useVideoSession(video))

    act(() => result.current.handlePlayerStateChange("playing", 1800))
    act(() => result.current.handlePlayerStateChange("paused", 1800))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/videos/dQw4w9WgXcQ/position",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining('"positionMs":1800'),
        }),
      )
    })
  })

  test("saves current position when page exits", async () => {
    const { result } = renderHook(() => useVideoSession(video))

    act(() => result.current.handleTimeUpdate(800))
    act(() => window.dispatchEvent(new Event("pagehide")))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/videos/dQw4w9WgXcQ/position",
        expect.objectContaining({
          keepalive: true,
          body: expect.stringContaining('"positionMs":800'),
        }),
      )
    })
  })

  test("reports failed position sync after retry", async () => {
    fetchMock.mockResolvedValue({ ok: false })
    const { result } = renderHook(() => useVideoSession(video))

    act(() => result.current.handlePlayerStateChange("paused", 800))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result.current.positionSyncError).toBe(true)
    })
  })

  test("exposes controlled unavailable player state", () => {
    const { result } = renderHook(() => useVideoSession(video))

    act(() => result.current.handlePlayerError("not-embeddable"))

    expect(result.current.playerState).toBe("unavailable")
    expect(result.current.playerError).toBe("not-embeddable")
  })
})
