import { describe, expect, test } from "vitest"
import type {
  ChoiceChallenge,
  OrderChallenge,
  TypeChallenge,
} from "../types/beat"
import {
  coinsForAttempt,
  hintForChoice,
  hintForOrder,
  hintForType,
} from "./rewards"

describe("coinsForAttempt", () => {
  test("pays full, half and nothing", () => {
    expect(coinsForAttempt(0)).toBe(10)
    expect(coinsForAttempt(1)).toBe(5)
    expect(coinsForAttempt(2)).toBe(5)
    expect(coinsForAttempt(3)).toBe(0)
    expect(coinsForAttempt(9)).toBe(0)
  })
})

describe("hints", () => {
  test("hintForChoice returns an incorrect option", () => {
    const challenge: ChoiceChallenge = {
      kind: "choice",
      prompt: "¿Cuál es la banana?",
      options: ["apple", "banana", "bread"],
      correct: 1,
    }
    const hidden = hintForChoice(challenge)
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
})
