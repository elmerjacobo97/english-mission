import { describe, expect, test } from "vitest"
import { canBuy, isOwned, nextLooks } from "./looks"
import type { LooksState } from "./types"

const empty: LooksState = { owned: [], equipped: "classic" }

describe("isOwned", () => {
  test("classic is always owned, even with an empty owned list", () => {
    expect(isOwned(empty, "classic")).toBe(true)
  })

  test("a paid look is owned only after it is in the list", () => {
    expect(isOwned(empty, "ocean")).toBe(false)
    expect(isOwned({ owned: ["ocean"], equipped: "ocean" }, "ocean")).toBe(
      true,
    )
  })
})

describe("canBuy", () => {
  test("true only for an unowned paid look with enough coins", () => {
    expect(canBuy(empty, 25, "ocean")).toBe(true)
    expect(canBuy(empty, 24, "ocean")).toBe(false)
    expect(canBuy(empty, 80, "party")).toBe(true)
  })

  test("false for classic, for a price of 0 and for an owned look", () => {
    expect(canBuy(empty, 100, "classic")).toBe(false)
    expect(canBuy({ owned: ["ocean"], equipped: "ocean" }, 100, "ocean")).toBe(
      false,
    )
  })
})

describe("nextLooks", () => {
  test("a new look joins owned and becomes equipped", () => {
    expect(nextLooks(empty, "ocean")).toEqual({
      owned: ["ocean"],
      equipped: "ocean",
    })
  })

  test("an owned look only changes equipped", () => {
    const looks: LooksState = { owned: ["ocean", "sunset"], equipped: "ocean" }
    expect(nextLooks(looks, "sunset")).toEqual({
      owned: ["ocean", "sunset"],
      equipped: "sunset",
    })
    expect(nextLooks(looks, "classic")).toEqual({
      owned: ["ocean", "sunset"],
      equipped: "classic",
    })
  })
})
