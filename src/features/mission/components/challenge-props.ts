import type { ChallengeOutcome } from "../types/run"
import type { DifficultyProfile } from "../utils/difficulty"

export type ChallengeProps = {
  coins: number
  rewardsEnabled: boolean
  freeHints?: boolean
  profile: DifficultyProfile
  solvedOutcome?: ChallengeOutcome
  speechAvailable?: boolean
  onSpendCoins: (amount: number) => boolean
  onSolved: (outcome: ChallengeOutcome) => void
  onContinue: () => void
}
