import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { testProfile } from "@/test/fixtures"
import { playSound } from "@/shared/lib/audio"
import { useChallengeRun } from "./use-challenge-run"

vi.mock("@/shared/lib/audio", () => ({
  playSound: vi.fn(),
}))

const mockedPlaySound = vi.mocked(playSound)

beforeEach(() => {
  mockedPlaySound.mockClear()
})

function renderRun() {
  return renderHook(() =>
    useChallengeRun({
      profile: testProfile,
      rewardsEnabled: true,
      correctAnswer: "banana",
      onSolved: vi.fn(),
    }),
  )
}

describe("useChallengeRun audio feedback", () => {
  test("plays correct once after a successful answer", () => {
    const { result } = renderRun()

    act(() => {
      result.current.registerSuccess()
    })

    expect(mockedPlaySound).toHaveBeenCalledTimes(1)
    expect(mockedPlaySound).toHaveBeenCalledWith("correct")
  })

  test("plays incorrect once per failed answer, including final reveal", () => {
    const { result } = renderRun()

    act(() => result.current.registerMistake("No"))
    act(() => result.current.registerMistake("No"))
    act(() => result.current.registerMistake("No"))

    expect(mockedPlaySound).toHaveBeenCalledTimes(3)
    expect(mockedPlaySound).toHaveBeenNthCalledWith(1, "incorrect")
    expect(mockedPlaySound).toHaveBeenNthCalledWith(2, "incorrect")
    expect(mockedPlaySound).toHaveBeenNthCalledWith(3, "incorrect")
    expect(result.current.feedback?.message).toBe("La respuesta era: banana")
  })
})
