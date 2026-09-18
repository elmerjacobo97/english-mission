import { beforeEach, describe, expect, test } from "vitest"
import { DAY_MS } from "@/features/review/utils/schedule"
import {
  addCoins,
  getMissionProgress,
  getProgressSnapshot,
  recordMissionResult,
  recordReviewResult,
  reloadProgress,
  resetProgress,
  spendCoins,
} from "./progress-store"

const NOW = 1_000_000_000_000

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
      version: 3,
      coins: 30,
      missions: {
        supermercado: { completed: true, stars: 2, bestCoins: 20 },
      },
      reviews: {},
    })
    expect(
      window.localStorage.getItem("english-mission:progress:v3"),
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
      version: 3,
      coins: 45,
      missions: {
        supermercado: { completed: true, stars: 1, bestCoins: 0 },
      },
      reviews: {},
    })
    expect(
      window.localStorage.getItem("english-mission:progress:v3"),
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

describe("resetProgress", () => {
  test("clears the review schedule", () => {
    recordReviewResult("apple", true, NOW)
    resetProgress()

    expect(getProgressSnapshot().reviews).toEqual({})
    expect(
      window.localStorage.getItem("english-mission:progress:v3"),
    ).toBeNull()
  })
})
