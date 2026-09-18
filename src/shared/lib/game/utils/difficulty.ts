import type { ChallengeKind } from "../types/beat"
import type { Level } from "../types/mission"

export type NarrationStyle = "full-es" | "short-es" | "brief-es" | "simple-en"

export type DifficultyProfile = {
  level: Level
  challengeKinds: ChallengeKind[]
  attemptsBeforeReveal: number
  typoTolerance: number
  hintCost: number
  firstTryReward: number
  retryReward: number
  bonusCoins: number
  narration: NarrationStyle
  englishVisible: boolean
}

export const LEVEL_PROFILES: Record<Level, DifficultyProfile> = {
  1: {
    level: 1,
    challengeKinds: ["choice"],
    attemptsBeforeReveal: 3,
    typoTolerance: 1,
    hintCost: 5,
    firstTryReward: 10,
    retryReward: 5,
    bonusCoins: 15,
    narration: "full-es",
    englishVisible: true,
  },
  2: {
    level: 2,
    challengeKinds: ["choice", "order"],
    attemptsBeforeReveal: 3,
    typoTolerance: 1,
    hintCost: 5,
    firstTryReward: 15,
    retryReward: 8,
    bonusCoins: 20,
    narration: "full-es",
    englishVisible: true,
  },
  3: {
    level: 3,
    challengeKinds: ["choice", "order", "type", "fill"],
    attemptsBeforeReveal: 3,
    typoTolerance: 1,
    hintCost: 10,
    firstTryReward: 20,
    retryReward: 10,
    bonusCoins: 30,
    narration: "short-es",
    englishVisible: true,
  },
  4: {
    level: 4,
    challengeKinds: ["choice", "order", "type", "fill", "listen"],
    attemptsBeforeReveal: 2,
    typoTolerance: 0,
    hintCost: 10,
    firstTryReward: 25,
    retryReward: 12,
    bonusCoins: 35,
    narration: "brief-es",
    englishVisible: false,
  },
  5: {
    level: 5,
    challengeKinds: [
      "choice",
      "order",
      "type",
      "fill",
      "listen",
      "dialogue",
    ],
    attemptsBeforeReveal: 2,
    typoTolerance: 0,
    hintCost: 15,
    firstTryReward: 30,
    retryReward: 15,
    bonusCoins: 40,
    narration: "simple-en",
    englishVisible: false,
  },
}

export function profileFor(level: Level): DifficultyProfile {
  return LEVEL_PROFILES[level]
}
