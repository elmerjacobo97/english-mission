import { describe, expect, test } from "vitest"
import {
  mapYouTubePlayerError,
  mapYouTubePlayerState,
} from "./youtube-player"

describe("YouTube player mappings", () => {
  test.each([
    [-1, "unstarted"],
    [0, "ended"],
    [1, "playing"],
    [2, "paused"],
    [3, "buffering"],
    [5, "cued"],
    [999, "unavailable"],
  ] as const)("maps state %s", (code, state) => {
    expect(mapYouTubePlayerState(code)).toBe(state)
  })

  test.each([
    [2, "invalid"],
    [5, "html5"],
    [100, "not-found"],
    [101, "not-embeddable"],
    [150, "not-embeddable"],
    [999, "unknown"],
  ] as const)("maps error %s", (code, error) => {
    expect(mapYouTubePlayerError(code)).toBe(error)
  })
})
