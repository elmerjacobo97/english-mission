import type {
  ChoiceChallenge,
  OrderChallenge,
  TypeChallenge,
} from "../types/beat"

export const HINT_COST = 5
export const FIRST_TRY_REWARD = 10
export const RETRY_REWARD = 5
export const MAX_ATTEMPTS = 3

export function coinsForAttempt(wrongAttempts: number): number {
  if (wrongAttempts === 0) {
    return FIRST_TRY_REWARD
  }
  if (wrongAttempts < MAX_ATTEMPTS) {
    return RETRY_REWARD
  }
  return 0
}

export function successMessage(
  wrongAttempts: number,
  rewardsEnabled: boolean,
): string {
  if (!rewardsEnabled) {
    return "¡Correcto!"
  }
  return wrongAttempts === 0
    ? `¡Correcto! +${FIRST_TRY_REWARD} monedas`
    : `¡Correcto! +${RETRY_REWARD} monedas`
}

export function revealedDetail(rewardsEnabled: boolean): string {
  return rewardsEnabled
    ? "Sin monedas esta vez, pero sigues avanzando."
    : "Sigues avanzando."
}

export function hintForChoice(challenge: ChoiceChallenge): number {
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
