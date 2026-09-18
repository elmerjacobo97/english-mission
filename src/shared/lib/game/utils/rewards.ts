import type { Stars } from "@/shared/lib/progress/types"
import type { FillChallenge, OrderChallenge, TypeChallenge } from "../types/beat"
import type { DifficultyProfile } from "./difficulty"

export const THREE_STAR_BONUS = 10

export function coinsForAttempt(
  wrongAttempts: number,
  profile: DifficultyProfile,
): number {
  if (wrongAttempts === 0) {
    return profile.firstTryReward
  }
  if (wrongAttempts < profile.attemptsBeforeReveal) {
    return profile.retryReward
  }
  return 0
}

export function starsForRun(run: {
  wrongAttempts: number
  hintsUsed: number
  reveals: number
}): Stars {
  if (run.reveals === 0 && run.hintsUsed === 0 && run.wrongAttempts === 0) {
    return 3
  }
  if (run.reveals === 0 && run.wrongAttempts <= 2) {
    return 2
  }
  return 1
}

export function missionPayout(input: {
  stars: Stars
  earned: number
  bonusCoins: number
  firstCompletion: boolean
  previousStars: Stars
}): { payout: number; bestCoins: number } {
  const completionBonus = input.firstCompletion ? input.bonusCoins : 0
  const threeStarBonus =
    input.stars === 3 && input.previousStars < 3 ? THREE_STAR_BONUS : 0
  return {
    payout: completionBonus + threeStarBonus,
    bestCoins: input.earned + completionBonus,
  }
}

export function successMessage(
  wrongAttempts: number,
  rewardsEnabled: boolean,
  profile: DifficultyProfile,
): string {
  if (!rewardsEnabled) {
    return "¡Correcto!"
  }
  const reward =
    wrongAttempts === 0 ? profile.firstTryReward : profile.retryReward
  return `¡Correcto! +${reward} monedas`
}

export function revealedDetail(rewardsEnabled: boolean): string {
  return rewardsEnabled
    ? "Sin monedas esta vez, pero sigues avanzando."
    : "Sigues avanzando."
}

export function hintForOption(challenge: {
  options: string[]
  correct: number
}): number {
  return challenge.options.findIndex((_, i) => i !== challenge.correct)
}

export function hintForOrder(
  challenge: OrderChallenge,
  attempt: (string | null)[],
): { position: number; token: string } | null {
  const position = challenge.solution.findIndex(
    (token, i) => attempt[i] !== token,
  )
  if (position === -1) {
    return null
  }
  return { position, token: challenge.solution[position] }
}

export function hintForType(challenge: TypeChallenge): string {
  return challenge.hint
}

export function hintForFill(challenge: FillChallenge): string {
  const rest = "_".repeat(Math.max(challenge.answer.length - 1, 1))
  return `${challenge.answer[0]}${rest}`
}
