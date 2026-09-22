import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { fetchYouTubeMetadata } from "./video-metadata.server"

const fetchMock = vi.fn()

function jsonResponse(payload: unknown, status = 200): Response {
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

describe("fetchYouTubeMetadata", () => {
  test("returns title and safe thumbnail from oEmbed", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        title: "A video",
        thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      }),
    )

    await expect(
      fetchYouTubeMetadata(
        "https://youtu.be/dQw4w9WgXcQ",
        "dQw4w9WgXcQ",
      ),
    ).resolves.toEqual({
      title: "A video",
      thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    })

    const [requestUrl] = fetchMock.mock.calls[0] as [string]
    expect(new URL(requestUrl).searchParams.get("format")).toBe("json")
  })

  test("uses safe fallback when metadata provider fails", async () => {
    fetchMock.mockRejectedValueOnce(new Error("provider details"))

    await expect(
      fetchYouTubeMetadata("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
    ).resolves.toEqual({
      title: "Video de YouTube (dQw4w9WgXcQ)",
      thumbnailUrl: null,
    })
  })
})
