import type { ChoiceChallenge } from "@/features/mission/types/beat"
import {
  profileFor,
  type DifficultyProfile,
} from "@/features/mission/utils/difficulty"
import { coinsForAttempt } from "@/features/mission/utils/rewards"
import { buildReviewChallenge } from "@/features/review/utils/review-exercise"
import type { ReviewWord } from "@/features/review/utils/review-queue"

export const SHOP_PROFILE: DifficultyProfile = profileFor(1)

export function pickShopWord(
  pool: ReviewWord[],
  random: () => number = Math.random,
): ReviewWord | null {
  if (pool.length === 0) {
    return null
  }
  return pool[Math.floor(random() * pool.length)]
}

export function buildShopChallenge(
  pool: ReviewWord[],
  random: () => number = Math.random,
): ChoiceChallenge | null {
  const word = pickShopWord(pool, random)
  if (!word) {
    return null
  }
  const challenge = buildReviewChallenge(
    { ...word, box: 1, dueAt: 0 },
    pool,
    false,
  )
  return challenge.kind === "choice" ? challenge : null
}

export function shopPayout(wrongAttempts: number, hintUsed: boolean): number {
  return coinsForAttempt(wrongAttempts + (hintUsed ? 1 : 0), SHOP_PROFILE)
}
