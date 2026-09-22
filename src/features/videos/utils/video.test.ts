import { describe, expect, test } from "vitest"

import {
  formatVideoTime,
  getActiveTranscriptSegmentIndex,
  getTranscriptDurationMs,
  isVideoLibraryItem,
  normalizeTranscriptPayload,
  parseYouTubeUrl,
} from "./video"

const segments = [
  { text: "First", startMs: 0, durationMs: 1000 },
  { text: "Second", startMs: 1000, durationMs: 1000 },
  { text: "Third", startMs: 2500, durationMs: 500 },
]

describe("parseYouTubeUrl", () => {
  test.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=30", "dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ?feature=share", "dQw4w9WgXcQ"],
  ])("parses %s", (value, videoId) => {
    expect(parseYouTubeUrl(value)).toEqual({ videoId, url: value })
  })

  test.each([
    "",
    "not a url",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch",
    "https://youtube.com/watch?v=too-short",
    "https://youtube.com/shorts/dQw4w9WgXcQ/extra",
    "ftp://youtube.com/watch?v=dQw4w9WgXcQ",
  ])("rejects %s", (value) => {
    expect(parseYouTubeUrl(value)).toBeNull()
  })
})

describe("normalizeTranscriptPayload", () => {
  test("normalizes English segments and timestamps", () => {
    expect(
      normalizeTranscriptPayload({
        lang: "en",
        content: [
          { text: "  Hello\nthere  ", offset: 0, duration: 1200, lang: "en" },
          { text: "Goodbye", offset: 1200, duration: 800 },
        ],
      }),
    ).toEqual({
      ok: true,
      value: {
        language: "en",
        segments: [
          { text: "Hello there", startMs: 0, durationMs: 1200 },
          { text: "Goodbye", startMs: 1200, durationMs: 800 },
        ],
      },
    })
  })

  test.each([
    [
      { lang: "es", content: [{ text: "Hola", offset: 0, duration: 500 }] },
      "unsupported-language",
    ],
    [{ lang: "en", content: [] }, "transcript-unavailable"],
    [
      { lang: "en", content: [{ text: "", offset: 0, duration: 500 }] },
      "invalid-response",
    ],
    [
      { lang: "en", content: [{ text: "Hi", offset: -1, duration: 500 }] },
      "invalid-response",
    ],
    [
      { lang: "en", content: [{ text: "Hi", offset: 0, duration: 0 }] },
      "invalid-response",
    ],
  ] as const)("rejects invalid payload with %s", (payload, code) => {
    expect(normalizeTranscriptPayload(payload)).toEqual({ ok: false, code })
  })
})

describe("getActiveTranscriptSegmentIndex", () => {
  test.each([
    [0, 0],
    [999, 0],
    [1000, 1],
    [1999, 1],
    [2500, 2],
    [2999, 2],
  ])("selects one segment at %s ms", (currentTimeMs, index) => {
    expect(getActiveTranscriptSegmentIndex(segments, currentTimeMs)).toBe(index)
  })

  test.each([-1, 2000, 2200, 3000, Number.NaN])(
    "returns no segment at %s ms when outside intervals",
    (currentTimeMs) => {
      expect(getActiveTranscriptSegmentIndex(segments, currentTimeMs)).toBeNull()
    },
  )
})

describe("video display helpers", () => {
  test("calculates transcript duration and formats it", () => {
    expect(getTranscriptDurationMs(segments)).toBe(3000)
    expect(formatVideoTime(3000)).toBe("0:03")
    expect(formatVideoTime(3_723_000)).toBe("1:02:03")
  })

  test("validates video library response shape", () => {
    expect(
      isVideoLibraryItem({
        videoId: "dQw4w9WgXcQ",
        url: "https://youtu.be/dQw4w9WgXcQ",
        title: "A video",
        thumbnailUrl: null,
        language: "en",
        segments: [{ text: "Hello", startMs: 0, durationMs: 1000 }],
        positionMs: 0,
        createdAt: "2026-09-22T00:00:00.000Z",
        updatedAt: "2026-09-22T00:00:00.000Z",
      }),
    ).toBe(true)
    expect(isVideoLibraryItem({ language: "es" })).toBe(false)
  })
})
