import type { ChallengeOutcome } from "@/lib/game/types/run"
import type { DifficultyProfile } from "@/lib/game/utils/difficulty"

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
