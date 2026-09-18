import type { ChallengeOutcome } from "../types/run"
import type { DifficultyProfile } from "../utils/difficulty"

export type ChallengeProps = {
  coins: number
  rewardsEnabled: boolean
  profile: DifficultyProfile
  speechAvailable?: boolean
  onSpendCoins: (amount: number) => boolean
  onSolved: (outcome: ChallengeOutcome) => void
  onContinue: () => void
}
