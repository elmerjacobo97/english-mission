import { describe, expect, test } from "vitest"
import { PLACEMENT_QUESTIONS, scorePlacement } from "./placement"

function answersWith(correctByBand: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    PLACEMENT_QUESTIONS.map((question) => {
      const count = correctByBand[question.band] ?? 0
      const indexInBand = PLACEMENT_QUESTIONS
        .filter((item) => item.band === question.band)
        .findIndex((item) => item.id === question.id)
      return [question.id, indexInBand < count ? question.correct : (question.correct + 1) % question.options.length]
    }),
  )
}

describe("scorePlacement", () => {
  test("recommends the highest sequential band passed", () => {
    expect(scorePlacement(answersWith({ basic: 3, intermediate: 3, advanced: 3 }))).toEqual({
      correctByBand: { basic: 3, intermediate: 3, advanced: 3 },
      recommended: "advanced",
    })
    expect(scorePlacement(answersWith({ basic: 3, intermediate: 2, advanced: 1 })).recommended).toBe("intermediate")
    expect(scorePlacement(answersWith({ basic: 2, intermediate: 1, advanced: 3 })).recommended).toBe("basic")
    expect(scorePlacement(answersWith({ basic: 1, intermediate: 3, advanced: 3 })).recommended).toBe("basic")
  })

  test("keeps three questions per course band", () => {
    expect(PLACEMENT_QUESTIONS.filter((question) => question.band === "basic")).toHaveLength(3)
    expect(PLACEMENT_QUESTIONS.filter((question) => question.band === "intermediate")).toHaveLength(3)
    expect(PLACEMENT_QUESTIONS.filter((question) => question.band === "advanced")).toHaveLength(3)
  })
})
