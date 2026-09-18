export type ChallengeFeedback = {
  tone: "error" | "success" | "info"
  message: string
  detail?: string
}

export type ChallengeOutcome = {
  reward: number
  wrongAttempts: number
  hintUsed: boolean
  revealed: boolean
}

export type MissionRunStats = {
  wrongAttempts: number
  hintsUsed: number
  reveals: number
}
