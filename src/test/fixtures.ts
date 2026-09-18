import type { DifficultyProfile } from "@/lib/game/utils/difficulty"

export const testProfile: DifficultyProfile = {
  level: 3,
  challengeKinds: ["choice", "order", "type", "fill", "listen", "dialogue"],
  attemptsBeforeReveal: 3,
  typoTolerance: 1,
  hintCost: 5,
  firstTryReward: 10,
  retryReward: 5,
  bonusCoins: 30,
  narration: "short-es",
  englishVisible: true,
}
