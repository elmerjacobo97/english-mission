import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import {
  AUDIO_FILES,
  getAudioServerSnapshot,
  getAudioSnapshot,
  isMuted,
  playSound,
  setMuted,
  subscribeAudio,
  toggleMuted,
} from "./audio"

class FakeAudio {
  static instances: FakeAudio[] = []
  static rejectPlayback = false

  readonly src: string
  currentTime = 0
  readonly pause = vi.fn()
  readonly play = vi.fn(() =>
    FakeAudio.rejectPlayback
      ? Promise.reject(new Error("blocked"))
      : Promise.resolve(),
  )
  readonly addEventListener = vi.fn()

  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }
}

beforeEach(() => {
  FakeAudio.instances = []
  FakeAudio.rejectPlayback = false
  vi.stubGlobal("Audio", FakeAudio)
  setMuted(true)
  setMuted(false)
})

afterEach(() => {
  setMuted(true)
  setMuted(false)
  vi.unstubAllGlobals()
})

describe("audio state", () => {
  test("starts unmuted and exposes stable server snapshot", () => {
    expect(isMuted()).toBe(false)
    expect(getAudioSnapshot()).toEqual({ muted: false })
    expect(getAudioServerSnapshot()).toBe(getAudioServerSnapshot())
    expect(getAudioServerSnapshot()).toEqual({ muted: false })
  })

  test("notifies subscribers when mute changes and toggles in memory", () => {
    const listener = vi.fn()
    const unsubscribe = subscribeAudio(listener)

    expect(toggleMuted()).toBe(true)
    expect(isMuted()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)

    expect(toggleMuted()).toBe(false)
    expect(isMuted()).toBe(false)
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    toggleMuted()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe("sound effects", () => {
  test("uses local asset paths and starts playback once", () => {
    expect(AUDIO_FILES).toEqual({
      correct: "/audio/correct.mp3",
      incorrect: "/audio/incorrect.mp3",
      missionComplete: "/audio/mission-complete.mp3",
    })

    playSound("correct")
    playSound("incorrect")
    playSound("mission-complete")

    expect(FakeAudio.instances.map((audio) => audio.src)).toEqual([
      AUDIO_FILES.correct,
      AUDIO_FILES.incorrect,
      AUDIO_FILES.missionComplete,
    ])
    FakeAudio.instances.forEach((audio) => {
      expect(audio.play).toHaveBeenCalledTimes(1)
    })
  })

  test("stops active effects and blocks new playback while muted", () => {
    playSound("correct")
    playSound("incorrect")

    setMuted(true)

    FakeAudio.instances.forEach((audio) => {
      expect(audio.pause).toHaveBeenCalledTimes(1)
      expect(audio.currentTime).toBe(0)
    })
    playSound("mission-complete")
    expect(FakeAudio.instances).toHaveLength(2)

    setMuted(false)
    expect(FakeAudio.instances).toHaveLength(2)
    playSound("mission-complete")
    expect(FakeAudio.instances).toHaveLength(3)
  })

  test("absorbs rejected playback", async () => {
    FakeAudio.rejectPlayback = true

    expect(() => playSound("correct")).not.toThrow()
    await Promise.resolve()
  })

  test("does nothing when browser has no Audio support", () => {
    vi.stubGlobal("Audio", undefined)

    expect(() => playSound("correct")).not.toThrow()
    expect(FakeAudio.instances).toHaveLength(0)
  })
})
