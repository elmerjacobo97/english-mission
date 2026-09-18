import { describe, expect, test } from "vitest"
import type { ReviewBox } from "@/shared/lib/progress/types"
import type { ReviewQueueItem, ReviewWord } from "./review-queue"
import {
  buildPracticeChallenge,
  buildReviewChallenge,
} from "./review-exercise"

const pool: ReviewWord[] = [
  { key: "apple", en: "apple", es: "manzana", level: 1, chapter: 1 },
  { key: "banana", en: "banana", es: "plátano", level: 1, chapter: 1 },
  { key: "bread", en: "bread", es: "pan", level: 1, chapter: 1 },
  { key: "tea", en: "tea", es: "té", level: 2, chapter: 1 },
  { key: "job", en: "job", es: "trabajo", level: 4, chapter: 3 },
]

function word(key: string, box: ReviewBox): ReviewQueueItem {
  const found = pool.find((candidate) => candidate.key === key)
  if (!found) {
    throw new Error(`unknown fixture word: ${key}`)
  }
  return { ...found, box, dueAt: 0 }
}

describe("box 1", () => {
  test("builds a spanish to english choice with same chapter distractors", () => {
    const challenge = buildReviewChallenge(word("tea", 1), pool, true)
    expect(challenge.kind).toBe("choice")
    if (challenge.kind !== "choice") {
      return
    }
    expect(challenge.prompt).toContain("té")
    expect(challenge.options).toEqual(["apple", "banana", "tea"])
    expect(challenge.options[challenge.correct]).toBe("tea")
  })

  test("picks distractors from other chapters when the same chapter runs out", () => {
    const smallPool = pool.filter((candidate) =>
      ["apple", "job"].includes(candidate.key),
    )
    const challenge = buildReviewChallenge(
      { ...smallPool[0], box: 1, dueAt: 0 },
      smallPool,
      true,
    )
    expect(challenge.kind).toBe("choice")
    if (challenge.kind !== "choice") {
      return
    }
    expect(challenge.options).toEqual(["apple", "job"])
  })

  test("uses the available words when the notebook has only two", () => {
    const tinyPool = pool.filter((candidate) =>
      ["apple", "banana"].includes(candidate.key),
    )
    const challenge = buildReviewChallenge(
      { ...tinyPool[0], box: 1, dueAt: 0 },
      tinyPool,
      true,
    )
    expect(challenge.kind).toBe("choice")
    if (challenge.kind !== "choice") {
      return
    }
    expect(challenge.options).toHaveLength(2)
  })
})

describe("box 2", () => {
  test("builds a typing challenge", () => {
    const challenge = buildReviewChallenge(word("bread", 2), pool, true)
    expect(challenge.kind).toBe("type")
    if (challenge.kind !== "type") {
      return
    }
    expect(challenge.prompt).toContain("pan")
    expect(challenge.accepted).toEqual(["bread"])
    expect(challenge.hint).toContain("b")
  })
})

describe("box 3", () => {
  test("builds a listening challenge when speech is available", () => {
    const challenge = buildReviewChallenge(word("apple", 3), pool, true)
    expect(challenge.kind).toBe("listen")
    if (challenge.kind !== "listen") {
      return
    }
    expect(challenge.phrase).toBe("apple")
    expect(challenge.options[challenge.correct]).toBe("apple")
  })

  test("falls back to typing without speech", () => {
    const challenge = buildReviewChallenge(word("apple", 3), pool, false)
    expect(challenge.kind).toBe("type")
  })
})

describe("tiny notebooks", () => {
  test("falls back to typing when there is only the target word", () => {
    const single = [pool[0]]
    const challenge = buildReviewChallenge(
      { ...single[0], box: 1, dueAt: 0 },
      single,
      true,
    )
    expect(challenge.kind).toBe("type")
  })
})

describe("practice builder", () => {
  test("box 1 builds a choice with the word as the correct option", () => {
    const result = buildPracticeChallenge(word("tea", 1), pool, true)
    expect(result.challenge.kind).toBe("choice")
    expect(result.speakText).toBeNull()
    if (result.challenge.kind !== "choice") {
      return
    }
    expect(result.challenge.options[result.challenge.correct]).toBe("tea")
  })

  test("box 1 falls back to typing when the pool has a single word", () => {
    const single = [pool[0]]
    const result = buildPracticeChallenge(
      { ...single[0], box: 1 },
      single,
      true,
    )
    expect(result.challenge.kind).toBe("type")
    expect(result.speakText).toBeNull()
  })

  test("box 2 builds a typing challenge without speak text", () => {
    const result = buildPracticeChallenge(word("bread", 2), pool, true)
    expect(result.challenge.kind).toBe("type")
    expect(result.speakText).toBeNull()
  })

  test("box 3 builds dictation when speech is available", () => {
    const result = buildPracticeChallenge(word("apple", 3), pool, true)
    expect(result.challenge.kind).toBe("type")
    expect(result.speakText).toBe("apple")
    if (result.challenge.kind !== "type") {
      return
    }
    expect(result.challenge.prompt).toBe("Escucha y escribe en inglés.")
  })

  test("box 3 falls back to plain typing without speech", () => {
    const result = buildPracticeChallenge(word("apple", 3), pool, false)
    expect(result.challenge.kind).toBe("type")
    expect(result.speakText).toBeNull()
  })

  test("the answer is always the word in english", () => {
    for (const box of [1, 2, 3] as const) {
      for (const speech of [true, false]) {
        const result = buildPracticeChallenge(word("banana", box), pool, speech)
        if (result.challenge.kind === "type") {
          expect(result.challenge.accepted).toContain("banana")
          continue
        }
        expect(result.challenge.kind).toBe("choice")
        if (result.challenge.kind === "choice") {
          expect(result.challenge.options[result.challenge.correct]).toBe(
            "banana",
          )
        }
      }
    }
  })
})
