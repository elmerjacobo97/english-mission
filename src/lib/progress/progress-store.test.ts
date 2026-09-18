import { beforeEach, describe, expect, test } from "vitest"
import { DAY_MS } from "@/features/review/utils/schedule"
import {
  addCoins,
  clearPendingMilestone,
  getMissionProgress,
  getProgressSnapshot,
  recordMissionResult,
  recordReviewResult,
  registerDailyActivity,
  reloadProgress,
  resetProgress,
  spendCoins,
} from "./progress-store"
import type { StreakState } from "./types"

const NOW = 1_000_000_000_000

const emptyStreak: StreakState = {
  current: 0,
  best: 0,
  lastDay: null,
  pendingMilestone: null,
}

function day(year: number, month: number, dayOfMonth: number): number {
  return new Date(year, month - 1, dayOfMonth, 12).getTime()
}

beforeEach(() => {
  resetProgress()
  window.localStorage.clear()
})

describe("coins", () => {
  test("adds and spends", () => {
    addCoins(20)
    expect(getProgressSnapshot().coins).toBe(20)
    expect(spendCoins(5)).toBe(true)
    expect(getProgressSnapshot().coins).toBe(15)
    expect(spendCoins(50)).toBe(false)
    expect(getProgressSnapshot().coins).toBe(15)
  })
})

describe("recordMissionResult", () => {
  test("marks completed and keeps the best stars and coins", () => {
    recordMissionResult("supermercado", { stars: 2, payout: 20, bestCoins: 20 })
    expect(getMissionProgress("supermercado")).toEqual({
      completed: true,
      stars: 2,
      bestCoins: 20,
    })
    expect(getProgressSnapshot().coins).toBe(20)

    recordMissionResult("supermercado", { stars: 1, payout: 0, bestCoins: 10 })
    expect(getMissionProgress("supermercado")).toEqual({
      completed: true,
      stars: 2,
      bestCoins: 20,
    })
    expect(getProgressSnapshot().coins).toBe(20)
  })

  test("reports default progress for unknown missions", () => {
    expect(getMissionProgress("nope")).toEqual({
      completed: false,
      stars: 0,
      bestCoins: 0,
    })
  })
})

describe("recordReviewResult", () => {
  test("creates the card on a clean pass and promotes it by box", () => {
    recordReviewResult("apple", true, NOW)
    expect(getProgressSnapshot().reviews.apple).toEqual({
      box: 2,
      dueAt: NOW + 3 * DAY_MS,
      lastReviewedAt: NOW,
    })

    recordReviewResult("apple", true, NOW + 1)
    expect(getProgressSnapshot().reviews.apple).toEqual({
      box: 3,
      dueAt: NOW + 1 + 7 * DAY_MS,
      lastReviewedAt: NOW + 1,
    })

    recordReviewResult("apple", true, NOW + 2)
    expect(getProgressSnapshot().reviews.apple?.box).toBe(3)
  })

  test("a failure sends the card back to box 1", () => {
    recordReviewResult("apple", true, NOW)
    recordReviewResult("apple", true, NOW + 1)
    recordReviewResult("apple", false, NOW + 5)

    expect(getProgressSnapshot().reviews.apple).toEqual({
      box: 1,
      dueAt: NOW + 5 + DAY_MS,
      lastReviewedAt: NOW + 5,
    })
  })
})

describe("migration from v3", () => {
  test("keeps coins, missions and reviews and adds an empty streak", () => {
    window.localStorage.setItem(
      "english-mission:progress:v3",
      JSON.stringify({
        version: 3,
        coins: 30,
        missions: {
          supermercado: { completed: true, stars: 2, bestCoins: 20 },
        },
        reviews: {
          apple: { box: 2, dueAt: NOW, lastReviewedAt: NOW },
        },
      }),
    )
    reloadProgress()

    expect(getProgressSnapshot()).toEqual({
      version: 4,
      coins: 30,
      missions: {
        supermercado: { completed: true, stars: 2, bestCoins: 20 },
      },
      reviews: {
        apple: { box: 2, dueAt: NOW, lastReviewedAt: NOW },
      },
      streak: emptyStreak,
    })
    expect(
      window.localStorage.getItem("english-mission:progress:v4"),
    ).toContain("supermercado")
    expect(
      window.localStorage.getItem("english-mission:progress:v3"),
    ).toBeNull()
  })
})

describe("migration from v2", () => {
  test("keeps coins and missions and adds an empty schedule", () => {
    window.localStorage.setItem(
      "english-mission:progress:v2",
      JSON.stringify({
        version: 2,
        coins: 30,
        missions: {
          supermercado: { completed: true, stars: 2, bestCoins: 20 },
        },
      }),
    )
    reloadProgress()

    expect(getProgressSnapshot()).toEqual({
      version: 4,
      coins: 30,
      missions: {
        supermercado: { completed: true, stars: 2, bestCoins: 20 },
      },
      reviews: {},
      streak: emptyStreak,
    })
    expect(
      window.localStorage.getItem("english-mission:progress:v4"),
    ).toContain("supermercado")
    expect(
      window.localStorage.getItem("english-mission:progress:v2"),
    ).toBeNull()
  })
})

describe("migration from v1", () => {
  test("converts completed slugs into missions with one star", () => {
    window.localStorage.setItem(
      "english-mission:progress:v1",
      JSON.stringify({
        version: 1,
        coins: 45,
        completed: ["supermercado"],
      }),
    )
    reloadProgress()

    expect(getProgressSnapshot()).toEqual({
      version: 4,
      coins: 45,
      missions: {
        supermercado: { completed: true, stars: 1, bestCoins: 0 },
      },
      reviews: {},
      streak: emptyStreak,
    })
    expect(
      window.localStorage.getItem("english-mission:progress:v4"),
    ).toContain("supermercado")
    expect(
      window.localStorage.getItem("english-mission:progress:v1"),
    ).toBeNull()
  })

  test("ignores corrupt data and starts fresh", () => {
    window.localStorage.setItem(
      "english-mission:progress:v1",
      JSON.stringify({ version: 1, coins: "mucho", completed: "no" }),
    )
    reloadProgress()
    expect(getProgressSnapshot().coins).toBe(0)
    expect(getProgressSnapshot().missions).toEqual({})
  })
})

describe("registerDailyActivity", () => {
  test("starts the streak on the first day", () => {
    registerDailyActivity(day(2026, 9, 10))

    expect(getProgressSnapshot().streak).toEqual({
      current: 1,
      best: 1,
      lastDay: "2026-09-10",
      pendingMilestone: null,
    })
    expect(getProgressSnapshot().coins).toBe(0)
  })

  test("does not mutate when the day is already registered", () => {
    registerDailyActivity(day(2026, 9, 10))
    const before = getProgressSnapshot()

    registerDailyActivity(day(2026, 9, 10))

    expect(getProgressSnapshot()).toBe(before)
    expect(getProgressSnapshot().streak.current).toBe(1)
  })

  test("pays the milestone once and sets pendingMilestone", () => {
    registerDailyActivity(day(2026, 9, 10))
    registerDailyActivity(day(2026, 9, 11))
    registerDailyActivity(day(2026, 9, 12))

    expect(getProgressSnapshot().streak).toEqual({
      current: 3,
      best: 3,
      lastDay: "2026-09-12",
      pendingMilestone: 3,
    })
    expect(getProgressSnapshot().coins).toBe(10)

    registerDailyActivity(day(2026, 9, 12))
    expect(getProgressSnapshot().coins).toBe(10)
  })
})

describe("clearPendingMilestone", () => {
  test("clears the notice without touching coins", () => {
    registerDailyActivity(day(2026, 9, 10))
    registerDailyActivity(day(2026, 9, 11))
    registerDailyActivity(day(2026, 9, 12))

    clearPendingMilestone()

    expect(getProgressSnapshot().streak.pendingMilestone).toBeNull()
    expect(getProgressSnapshot().coins).toBe(10)

    const before = getProgressSnapshot()
    clearPendingMilestone()
    expect(getProgressSnapshot()).toBe(before)
  })
})

describe("resetProgress", () => {
  test("clears the review schedule and the streak", () => {
    recordReviewResult("apple", true, NOW)
    registerDailyActivity(day(2026, 9, 10))
    resetProgress()

    expect(getProgressSnapshot().reviews).toEqual({})
    expect(getProgressSnapshot().streak).toEqual(emptyStreak)
    expect(
      window.localStorage.getItem("english-mission:progress:v4"),
    ).toBeNull()
  })
})
