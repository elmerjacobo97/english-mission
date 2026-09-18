import type { ChoiceChallenge } from "@/shared/lib/game/types/beat"
import {
  profileFor,
  type DifficultyProfile,
} from "@/shared/lib/game/utils/difficulty"
import { coinsForAttempt } from "@/shared/lib/game/utils/rewards"
import { buildReviewChallenge } from "@/shared/lib/review/review-exercise"
import type { ReviewWord } from "@/shared/lib/review/review-queue"

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
