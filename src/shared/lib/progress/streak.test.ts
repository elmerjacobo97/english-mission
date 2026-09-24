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
  freezes: 0,
  pendingFreezesUsed: 0,
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
      freezes: 2,
      pendingFreezesUsed: 1,
    }
    expect(nextStreak(state, "2026-09-10")).toEqual({
      streak: state,
      payout: 0,
    })
  })

  test("consecutive day adds one and updates best without spending a freeze", () => {
    expect(
      nextStreak(
        { ...empty, current: 1, best: 1, lastDay: "2026-09-10", freezes: 1 },
        "2026-09-11",
      ),
    ).toEqual({
      streak: {
        current: 2,
        best: 2,
        lastDay: "2026-09-11",
        pendingMilestone: null,
        freezes: 1,
        pendingFreezesUsed: 0,
      },
      payout: 0,
    })
  })

  test("a gap of two or more days resets current to 1 and keeps best", () => {
    expect(
      nextStreak(
        {
          current: 5,
          best: 9,
          lastDay: "2026-09-10",
          pendingMilestone: null,
          freezes: 0,
          pendingFreezesUsed: 0,
        },
        "2026-09-13",
      ),
    ).toEqual({
      streak: {
        current: 1,
        best: 9,
        lastDay: "2026-09-13",
        pendingMilestone: null,
        freezes: 0,
        pendingFreezesUsed: 0,
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
          freezes: 0,
          pendingFreezesUsed: 0,
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
      {
        current: 3,
        best: 3,
        lastDay: "2026-09-10",
        pendingMilestone: 3,
        freezes: 0,
        pendingFreezesUsed: 0,
      },
      "2026-09-11",
    )
    expect(result.payout).toBe(0)
    expect(result.streak.pendingMilestone).toBe(3)
  })

  test("a new streak can win the milestone again", () => {
    const afterGap = nextStreak(
      {
        current: 2,
        best: 30,
        lastDay: "2026-09-10",
        pendingMilestone: null,
        freezes: 0,
        pendingFreezesUsed: 0,
      },
      "2026-09-13",
    )
    expect(afterGap.streak.current).toBe(1)

    const second = nextStreak(afterGap.streak, "2026-09-14")
    expect(second.streak.current).toBe(2)

    const third = nextStreak(second.streak, "2026-09-15")
    expect(third.streak.current).toBe(3)
    expect(third.payout).toBe(10)
  })

  test("one skipped day spends one freeze and keeps the streak", () => {
    expect(
      nextStreak(
        {
          ...empty,
          current: 4,
          best: 4,
          lastDay: "2026-09-07",
          freezes: 2,
        },
        "2026-09-09",
      ),
    ).toEqual({
      streak: {
        current: 5,
        best: 5,
        lastDay: "2026-09-09",
        pendingMilestone: null,
        freezes: 1,
        pendingFreezesUsed: 1,
      },
      payout: 0,
    })
  })

  test("two skipped days spend both freezes and keep the streak", () => {
    expect(
      nextStreak(
        {
          ...empty,
          current: 4,
          best: 4,
          lastDay: "2026-09-07",
          freezes: 2,
        },
        "2026-09-10",
      ),
    ).toEqual({
      streak: {
        current: 5,
        best: 5,
        lastDay: "2026-09-10",
        pendingMilestone: null,
        freezes: 0,
        pendingFreezesUsed: 2,
      },
      payout: 0,
    })
  })

  test("a covered gap that lands on a milestone still pays", () => {
    const result = nextStreak(
      {
        ...empty,
        current: 2,
        best: 2,
        lastDay: "2026-09-07",
        freezes: 1,
      },
      "2026-09-09",
    )
    expect(result.payout).toBe(STREAK_MILESTONES[3])
    expect(result.streak.current).toBe(3)
    expect(result.streak.pendingMilestone).toBe(3)
    expect(result.streak.freezes).toBe(0)
    expect(result.streak.pendingFreezesUsed).toBe(1)
  })

  test("extra skipped days reset the streak and keep every freeze", () => {
    expect(
      nextStreak(
        {
          ...empty,
          current: 5,
          best: 9,
          lastDay: "2026-09-07",
          freezes: 2,
          pendingFreezesUsed: 1,
        },
        "2026-09-11",
      ),
    ).toEqual({
      streak: {
        current: 1,
        best: 9,
        lastDay: "2026-09-11",
        pendingMilestone: null,
        freezes: 2,
        pendingFreezesUsed: 0,
      },
      payout: 0,
    })
  })

  test("a streak of zero does not spend freezes", () => {
    expect(
      nextStreak(
        {
          ...empty,
          lastDay: "2026-09-07",
          freezes: 2,
        },
        "2026-09-10",
      ),
    ).toEqual({
      streak: {
        current: 1,
        best: 1,
        lastDay: "2026-09-10",
        pendingMilestone: null,
        freezes: 2,
        pendingFreezesUsed: 0,
      },
      payout: 0,
    })
  })
})
