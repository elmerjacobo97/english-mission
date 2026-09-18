import { describe, expect, test } from "vitest"
import {
  MAX_DAILY_RECHARGES,
  canRecharge,
  nextShop,
  rechargesUsed,
} from "./shop"
import type { ShopState } from "./types"

const empty: ShopState = { day: null, count: 0 }

describe("rechargesUsed", () => {
  test("counts zero with no day or another day", () => {
    expect(rechargesUsed(empty, "2026-09-18")).toBe(0)
    expect(rechargesUsed({ day: "2026-09-17", count: 2 }, "2026-09-18")).toBe(0)
  })

  test("returns the count for the same day", () => {
    expect(rechargesUsed({ day: "2026-09-18", count: 2 }, "2026-09-18")).toBe(
      2,
    )
  })
})

describe("canRecharge", () => {
  test("allows up to the daily cap", () => {
    expect(canRecharge({ day: "2026-09-18", count: 2 }, "2026-09-18")).toBe(
      true,
    )
    expect(
      canRecharge(
        { day: "2026-09-18", count: MAX_DAILY_RECHARGES },
        "2026-09-18",
      ),
    ).toBe(false)
  })

  test("a new day restores the quota", () => {
    expect(
      canRecharge(
        { day: "2026-09-17", count: MAX_DAILY_RECHARGES },
        "2026-09-18",
      ),
    ).toBe(true)
  })
})

describe("nextShop", () => {
  test("starts at one on a new day", () => {
    expect(nextShop(empty, "2026-09-18")).toEqual({
      day: "2026-09-18",
      count: 1,
    })
    expect(nextShop({ day: "2026-09-17", count: 3 }, "2026-09-18")).toEqual({
      day: "2026-09-18",
      count: 1,
    })
  })

  test("accumulates on the same day", () => {
    expect(nextShop({ day: "2026-09-18", count: 1 }, "2026-09-18")).toEqual({
      day: "2026-09-18",
      count: 2,
    })
  })
})
