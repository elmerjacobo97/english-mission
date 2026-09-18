import { beforeEach, describe, expect, test } from "vitest"
import {
  addCoins,
  getMissionProgress,
  getProgressSnapshot,
  recordMissionResult,
  reloadProgress,
  resetProgress,
  spendCoins,
} from "./progress-store"

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
      version: 2,
      coins: 45,
      missions: {
        supermercado: { completed: true, stars: 1, bestCoins: 0 },
      },
    })
    expect(
      window.localStorage.getItem("english-mission:progress:v2"),
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
