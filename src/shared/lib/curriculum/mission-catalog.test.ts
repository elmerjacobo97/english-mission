import { describe, expect, test } from "vitest"
import { emptyProgress } from "@/shared/lib/progress/progress-mappers"
import { courseEntries, isUnlocked, nextMissionSlug } from "./mission-catalog"

describe("course routes", () => {
  test("offers an independent first mission in each selected band", () => {
    expect(courseEntries("basic")).toHaveLength(8)
    expect(courseEntries("intermediate").map((entry) => entry.slug)).toEqual([
      "interview",
    ])
    expect(courseEntries("advanced").map((entry) => entry.slug)).toEqual([
      "first-day",
      "friends",
      "new-home",
    ])
    expect(nextMissionSlug(emptyProgress, "intermediate")).toBe("interview")
    expect(nextMissionSlug(emptyProgress, "advanced")).toBe("first-day")
  })

  test("unlocks later missions only after the previous mission in that route", () => {
    const basicFirst = courseEntries("basic")[0]
    const basicSecond = courseEntries("basic")[1]
    const advancedFirst = courseEntries("advanced")[0]

    expect(isUnlocked(basicSecond, emptyProgress)).toBe(false)
    expect(isUnlocked(advancedFirst, emptyProgress)).toBe(true)
    expect(
      isUnlocked(basicSecond, {
        ...emptyProgress,
        missions: {
          [basicFirst.slug]: { completed: true, stars: 1, bestCoins: 10 },
        },
      }),
    ).toBe(true)
  })
})
