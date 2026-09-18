import { describe, expect, test } from "vitest"
import type { ReviewBox, ReviewCard } from "@/shared/lib/progress/types"
import { DAY_MS, REVIEW_INTERVALS_MS, nextCard } from "./schedule"

const NOW = 1_700_000_000_000

function card(box: ReviewBox): ReviewCard {
  return { box, dueAt: NOW, lastReviewedAt: null }
}

describe("REVIEW_INTERVALS_MS", () => {
  test("uses 1, 3 and 7 days", () => {
    expect(REVIEW_INTERVALS_MS).toEqual({
      1: DAY_MS,
      2: 3 * DAY_MS,
      3: 7 * DAY_MS,
    })
  })
})

describe("nextCard", () => {
  test("promotes box 1 to 2 with a 3 day due date", () => {
    expect(nextCard(card(1), true, NOW)).toEqual({
      box: 2,
      dueAt: NOW + 3 * DAY_MS,
      lastReviewedAt: NOW,
    })
  })

  test("promotes box 2 to 3 with a 7 day due date", () => {
    expect(nextCard(card(2), true, NOW)).toEqual({
      box: 3,
      dueAt: NOW + 7 * DAY_MS,
      lastReviewedAt: NOW,
    })
  })

  test("keeps box 3 capped with a 7 day due date", () => {
    expect(nextCard(card(3), true, NOW)).toEqual({
      box: 3,
      dueAt: NOW + 7 * DAY_MS,
      lastReviewedAt: NOW,
    })
  })

  test("a failure resets the card to box 1 due tomorrow", () => {
    expect(nextCard(card(3), false, NOW)).toEqual({
      box: 1,
      dueAt: NOW + DAY_MS,
      lastReviewedAt: NOW,
    })
  })
})
