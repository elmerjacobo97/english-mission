import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { isMuted, setMuted } from "./audio"
import { isSpeechSupported, speak, stopSpeaking } from "./speech"

class FakeUtterance {
  lang = ""
  rate = 0
  voice: SpeechSynthesisVoice | null = null

  constructor(readonly text: string) {}
}

const speechSynthesis = {
  cancel: vi.fn(),
  getVoices: vi.fn(() => []),
  speak: vi.fn(),
}

beforeEach(() => {
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance)
  vi.stubGlobal("speechSynthesis", speechSynthesis)
  speechSynthesis.cancel.mockClear()
  speechSynthesis.getVoices.mockClear()
  speechSynthesis.speak.mockClear()
  setMuted(false)
})

afterEach(() => {
  setMuted(false)
  vi.unstubAllGlobals()
})

describe("speech audio state", () => {
  test("speaks when audio is enabled", () => {
    expect(isSpeechSupported()).toBe(true)

    speak("hello", 0.8)

    expect(speechSynthesis.cancel).toHaveBeenCalledTimes(1)
    expect(speechSynthesis.speak).toHaveBeenCalledTimes(1)
    expect(speechSynthesis.speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: "hello", lang: "en-US", rate: 0.8 }),
    )
    expect(isMuted()).toBe(false)
  })

  test("blocks new speech while muted but keeps stopSpeaking available", () => {
    setMuted(true)

    speak("hello")
    expect(speechSynthesis.speak).not.toHaveBeenCalled()

    stopSpeaking()
    expect(speechSynthesis.cancel).toHaveBeenCalledTimes(1)
  })

  test("falls back silently without SpeechSynthesis", () => {
    vi.stubGlobal("speechSynthesis", undefined)

    expect(isSpeechSupported()).toBe(false)
    expect(() => speak("hello")).not.toThrow()
    expect(() => stopSpeaking()).not.toThrow()
  })
})
