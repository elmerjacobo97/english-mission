import { describe, expect, test } from "vitest"
import {
  checkOrderedAnswer,
  checkTypedAnswer,
  normalizeAnswer,
} from "./answer-check"

describe("normalizeAnswer", () => {
  test("lowers, strips accents, punctuation and extra spaces", () => {
    expect(normalizeAnswer("  ¡Hello,   WORLD!  ")).toBe("hello world")
    expect(normalizeAnswer("café")).toBe("cafe")
    expect(normalizeAnswer("I want 2 bananas.")).toBe("i want 2 bananas")
  })
})

describe("checkTypedAnswer", () => {
  const accepted = ["I want two bananas", "I want 2 bananas"]

  test("accepts exact and normalized variants", () => {
    expect(checkTypedAnswer("i want two bananas", accepted)).toEqual({
      ok: true,
    })
    expect(checkTypedAnswer("  I WANT 2 BANANAS! ", accepted)).toEqual({
      ok: true,
    })
  })

  test("tolerates one typo per word of four or more letters", () => {
    expect(checkTypedAnswer("i want two banans", accepted)).toEqual({ ok: true })
    expect(checkTypedAnswer("i want two bananasss", accepted).ok).toBe(false)
  })

  test("stays strict on short words", () => {
    expect(
      checkTypedAnswer("i want too bananas", ["i want two bananas"]).ok,
    ).toBe(false)
  })

  test("reports the wrong word", () => {
    expect(checkTypedAnswer("i want two breads", ["i want two bananas"])).toEqual(
      { ok: false, wrongWord: "breads" },
    )
  })

  test("rejects empty input and word-count mismatches", () => {
    expect(checkTypedAnswer("   ", ["i want two bananas"]).ok).toBe(false)
    expect(checkTypedAnswer("i want bananas", ["i want two bananas"])).toEqual({
      ok: false,
    })
  })
})

describe("checkOrderedAnswer", () => {
  const solution = ["I", "want", "to", "buy", "bananas"]

  test("compares tokens ignoring case and punctuation", () => {
    expect(
      checkOrderedAnswer(["i", "Want", "to", "buy", "bananas."], solution),
    ).toBe(true)
    expect(
      checkOrderedAnswer(["I", "want", "buy", "to", "bananas"], solution),
    ).toBe(false)
    expect(checkOrderedAnswer(["I", "want"], solution)).toBe(false)
  })
})
