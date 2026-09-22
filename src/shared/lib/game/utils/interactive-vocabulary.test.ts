import { describe, expect, test } from "vitest"
import {
  segmentInteractiveVocabulary,
  vocabularyTermAppears,
} from "./interactive-vocabulary"

describe("segmentInteractiveVocabulary", () => {
  test("preserves case, punctuation, and surrounding text", () => {
    expect(
      segmentInteractiveVocabulary("Hello, WORLD!", [
        ["world", "mundo"],
      ]),
    ).toEqual([
      { kind: "text", text: "Hello, " },
      { kind: "vocabulary", text: "WORLD", en: "world", es: "mundo" },
      { kind: "text", text: "!" },
    ])
  })

  test("segments every repetition and respects word boundaries", () => {
    expect(
      segmentInteractiveVocabulary("No, not now. No!", [
        ["no", "no"],
      ]),
    ).toEqual([
      { kind: "vocabulary", text: "No", en: "no", es: "no" },
      { kind: "text", text: ", not now. " },
      { kind: "vocabulary", text: "No", en: "no", es: "no" },
      { kind: "text", text: "!" },
    ])
  })

  test("does not treat an inflected word as the vocabulary term", () => {
    expect(vocabularyTermAppears("Bananas, apples, please.", "banana")).toBe(false)
    expect(vocabularyTermAppears("Bananas, apples, please.", "apple")).toBe(false)
    expect(vocabularyTermAppears("A banana, an apple, please.", "banana")).toBe(true)
    expect(vocabularyTermAppears("A banana, an apple, please.", "apple")).toBe(true)
  })

  test("prioritizes the longest overlapping phrase", () => {
    expect(
      segmentInteractiveVocabulary("Nice to meet you today", [
        ["meet", "conocer"],
        ["nice to meet you", "mucho gusto"],
      ]),
    ).toEqual([
      { kind: "vocabulary", text: "Nice to meet you", en: "nice to meet you", es: "mucho gusto" },
      { kind: "text", text: " today" },
    ])
  })
})
