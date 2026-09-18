import { describe, expect, test } from "vitest"
import {
  STREAK_MILESTONES,
  localDayKey,
  nextStreak,
  previousDayKey,
} from "./streak"
import type { StreakState } from "./types"

const empty: StreakState = {
  current: 0,
  best: 0,
  lastDay: null,
  pendingMilestone: null,
}

describe("localDayKey", () => {
  test("formats the local date with padding", () => {
    expect(localDayKey(new Date(2026, 0, 5))).toBe("2026-01-05")
    expect(localDayKey(new Date(2026, 11, 31))).toBe("2026-12-31")
  })
})

describe("previousDayKey", () => {
  test("crosses month end", () => {
    expect(previousDayKey("2026-03-01")).toBe("2026-02-28")
  })

  test("crosses year end", () => {
    expect(previousDayKey("2026-01-01")).toBe("2025-12-31")
  })
})

describe("nextStreak", () => {
  test("same day keeps the state and pays nothing", () => {
    const state: StreakState = {
      current: 4,
      best: 6,
      lastDay: "2026-09-10",
      pendingMilestone: 3,
    }
    expect(nextStreak(state, "2026-09-10")).toEqual({
      streak: state,
      payout: 0,
    })
  })

  test("consecutive day adds one and updates best", () => {
    expect(
      nextStreak(
        { ...empty, current: 1, best: 1, lastDay: "2026-09-10" },
        "2026-09-11",
      ),
    ).toEqual({
      streak: {
        current: 2,
        best: 2,
        lastDay: "2026-09-11",
        pendingMilestone: null,
      },
      payout: 0,
    })
  })

  test("a gap of two or more days resets current to 1 and keeps best", () => {
    expect(
      nextStreak(
        { current: 5, best: 9, lastDay: "2026-09-10", pendingMilestone: null },
        "2026-09-13",
      ),
    ).toEqual({
      streak: {
        current: 1,
        best: 9,
        lastDay: "2026-09-13",
        pendingMilestone: null,
      },
      payout: 0,
    })
  })

  test("pays each milestone once per streak", () => {
    for (const milestone of [3, 7, 30] as const) {
      const day = `2026-09-${String(milestone).padStart(2, "0")}`
      const result = nextStreak(
        {
          current: milestone - 1,
          best: milestone - 1,
          lastDay: previousDayKey(day),
          pendingMilestone: null,
        },
        day,
      )
      expect(result.payout).toBe(STREAK_MILESTONES[milestone])
      expect(result.streak.current).toBe(milestone)
      expect(result.streak.pendingMilestone).toBe(milestone)

      const repeat = nextStreak(result.streak, day)
      expect(repeat.payout).toBe(0)
      expect(repeat.streak).toEqual(result.streak)
    }
  })

  test("a plain day does not pay and keeps a pending milestone", () => {
    const result = nextStreak(
      { current: 3, best: 3, lastDay: "2026-09-10", pendingMilestone: 3 },
      "2026-09-11",
    )
    expect(result.payout).toBe(0)
    expect(result.streak.pendingMilestone).toBe(3)
  })

  test("a new streak can win the milestone again", () => {
    const afterGap = nextStreak(
      { current: 2, best: 30, lastDay: "2026-09-10", pendingMilestone: null },
      "2026-09-13",
    )
    expect(afterGap.streak.current).toBe(1)

    const second = nextStreak(afterGap.streak, "2026-09-14")
    expect(second.streak.current).toBe(2)

    const third = nextStreak(second.streak, "2026-09-15")
    expect(third.streak.current).toBe(3)
    expect(third.payout).toBe(10)
  })
})
