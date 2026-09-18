import type { ReviewBox, ReviewCard } from "@/lib/progress/types"

export const DAY_MS = 24 * 60 * 60 * 1000

export const REVIEW_INTERVALS_MS: Record<ReviewBox, number> = {
  1: DAY_MS,
  2: 3 * DAY_MS,
  3: 7 * DAY_MS,
}

export function nextCard(card: ReviewCard, passed: boolean, now: number): ReviewCard {
  const box: ReviewBox = passed ? (Math.min(card.box + 1, 3) as ReviewBox) : 1
  return {
    box,
    dueAt: now + REVIEW_INTERVALS_MS[box],
    lastReviewedAt: now,
  }
}
