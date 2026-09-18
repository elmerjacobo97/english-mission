import { describe, expect, test } from "vitest"
import { profileFor } from "@/lib/game/utils/difficulty"
import type { ReviewWord } from "@/lib/review/review-queue"
import {
  SHOP_PROFILE,
  buildShopChallenge,
  pickShopWord,
  shopPayout,
} from "./shop-exercise"

function word(en: string, es: string): ReviewWord {
  return { key: en, en, es, level: 1, chapter: 1 }
}

const pool: ReviewWord[] = [
  word("hello", "hola"),
  word("goodbye", "adiós"),
  word("please", "por favor"),
  word("thanks", "gracias"),
]

describe("pickShopWord", () => {
  test("returns null on an empty pool", () => {
    expect(pickShopWord([])).toBeNull()
  })

  test("picks with the injected random source", () => {
    expect(pickShopWord(pool, () => 0)).toEqual(pool[0])
    expect(pickShopWord(pool, () => 0.75)).toEqual(pool[3])
  })
})

describe("buildShopChallenge", () => {
  test("returns null without words", () => {
    expect(buildShopChallenge([])).toBeNull()
  })

  test("returns null when the pool cannot fill a choice", () => {
    expect(buildShopChallenge([word("hello", "hola")])).toBeNull()
  })

  test("builds a choice whose correct option is the picked word", () => {
    const challenge = buildShopChallenge(pool, () => 0)
    if (!challenge) {
      throw new Error("expected a challenge")
    }

    expect(challenge.kind).toBe("choice")
    expect(challenge.options).toHaveLength(3)
    expect(challenge.options[challenge.correct]).toBe("hello")
    expect(challenge.prompt).toContain("«hola»")
  })
})

describe("shopPayout", () => {
  test("pays 10 on a clean first try", () => {
    expect(shopPayout(0, false)).toBe(10)
  })

  test("pays 5 with a failure or a free hint", () => {
    expect(shopPayout(1, false)).toBe(5)
    expect(shopPayout(0, true)).toBe(5)
    expect(shopPayout(1, true)).toBe(5)
  })

  test("pays 0 once the answer was revealed", () => {
    expect(shopPayout(2, true)).toBe(0)
    expect(shopPayout(3, false)).toBe(0)
  })

  test("uses the level 1 payment profile", () => {
    expect(SHOP_PROFILE).toEqual(profileFor(1))
  })
})
