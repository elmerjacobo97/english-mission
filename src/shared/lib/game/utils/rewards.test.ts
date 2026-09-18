import { describe, expect, test } from "vitest"
import type {
  ChoiceChallenge,
  OrderChallenge,
  TypeChallenge,
} from "../types/beat"
import { profileFor } from "./difficulty"
import {
  coinsForAttempt,
  hintForFill,
  hintForOption,
  hintForOrder,
  hintForType,
  missionPayout,
  starsForRun,
  successMessage,
} from "./rewards"

const level1 = profileFor(1)
const level3 = profileFor(3)
const level5 = profileFor(5)

describe("coinsForAttempt", () => {
  test("scales with the level profile", () => {
    expect(coinsForAttempt(0, level1)).toBe(10)
    expect(coinsForAttempt(1, level1)).toBe(5)
    expect(coinsForAttempt(2, level1)).toBe(5)
    expect(coinsForAttempt(3, level1)).toBe(0)
    expect(coinsForAttempt(0, level5)).toBe(30)
    expect(coinsForAttempt(1, level5)).toBe(15)
    expect(coinsForAttempt(2, level5)).toBe(0)
  })
})

describe("starsForRun", () => {
  test("gives three stars only for a flawless run", () => {
    expect(starsForRun({ wrongAttempts: 0, hintsUsed: 0, reveals: 0 })).toBe(3)
    expect(starsForRun({ wrongAttempts: 0, hintsUsed: 1, reveals: 0 })).toBe(2)
    expect(starsForRun({ wrongAttempts: 1, hintsUsed: 0, reveals: 0 })).toBe(2)
    expect(starsForRun({ wrongAttempts: 2, hintsUsed: 0, reveals: 0 })).toBe(2)
    expect(starsForRun({ wrongAttempts: 3, hintsUsed: 0, reveals: 0 })).toBe(1)
    expect(starsForRun({ wrongAttempts: 0, hintsUsed: 0, reveals: 1 })).toBe(1)
  })
})

describe("missionPayout", () => {
  test("pays the mission bonus only on first completion", () => {
    expect(
      missionPayout({
        stars: 2,
        earned: 40,
        bonusCoins: 30,
        firstCompletion: true,
        previousStars: 0,
      }),
    ).toEqual({ payout: 30, bestCoins: 70 })
    expect(
      missionPayout({
        stars: 2,
        earned: 0,
        bonusCoins: 30,
        firstCompletion: false,
        previousStars: 2,
      }),
    ).toEqual({ payout: 0, bestCoins: 0 })
  })

  test("pays the three star bonus once when improving", () => {
    expect(
      missionPayout({
        stars: 3,
        earned: 50,
        bonusCoins: 30,
        firstCompletion: true,
        previousStars: 0,
      }),
    ).toEqual({ payout: 40, bestCoins: 80 })
    expect(
      missionPayout({
        stars: 3,
        earned: 0,
        bonusCoins: 30,
        firstCompletion: false,
        previousStars: 2,
      }),
    ).toEqual({ payout: 10, bestCoins: 0 })
    expect(
      missionPayout({
        stars: 3,
        earned: 0,
        bonusCoins: 30,
        firstCompletion: false,
        previousStars: 3,
      }),
    ).toEqual({ payout: 0, bestCoins: 0 })
  })
})

describe("successMessage", () => {
  test("uses profile rewards and hides coins on replay", () => {
    expect(successMessage(0, true, level3)).toBe("¡Correcto! +20 monedas")
    expect(successMessage(1, true, level3)).toBe("¡Correcto! +10 monedas")
    expect(successMessage(0, false, level3)).toBe("¡Correcto!")
  })
})

describe("hints", () => {
  test("hintForOption returns an incorrect option", () => {
    const challenge: ChoiceChallenge = {
      kind: "choice",
      prompt: "¿Cuál es la banana?",
      options: ["apple", "banana", "bread"],
      correct: 1,
    }
    const hidden = hintForOption(challenge)
    expect(hidden).not.toBe(challenge.correct)
    expect(hidden).toBeGreaterThanOrEqual(0)
    expect(hidden).toBeLessThan(challenge.options.length)
  })

  test("hintForOrder fills the first mismatched position", () => {
    const challenge: OrderChallenge = {
      kind: "order",
      prompt: "Ordena la frase",
      tokens: ["to", "I", "bananas", "want", "buy"],
      solution: ["I", "want", "to", "buy", "bananas"],
    }
    expect(hintForOrder(challenge, [null, null, null, null, null])).toEqual({
      position: 0,
      token: "I",
    })
    expect(hintForOrder(challenge, ["I", "want", null, null, null])).toEqual({
      position: 2,
      token: "to",
    })
    expect(
      hintForOrder(challenge, ["I", "want", "to", "buy", "bananas"]),
    ).toBeNull()
  })

  test("hintForType returns the authored hint", () => {
    const challenge: TypeChallenge = {
      kind: "type",
      prompt: "Escribe en inglés",
      accepted: ["i want two bananas"],
      hint: "I want two b______",
    }
    expect(hintForType(challenge)).toBe("I want two b______")
  })

  test("hintForFill masks the answer keeping the first letter", () => {
    expect(
      hintForFill({
        kind: "fill",
        prompt: "Completa",
        sentence: "Can I ___ a coffee?",
        answer: "have",
      }),
    ).toBe("h___")
  })
})
