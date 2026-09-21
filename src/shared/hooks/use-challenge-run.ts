"use client"

import { useState } from "react"
import { playSound } from "@/shared/lib/audio"
import type { ChallengeFeedback, ChallengeOutcome } from "@/shared/lib/game/types/run"
import type { DifficultyProfile } from "@/shared/lib/game/utils/difficulty"
import {
  coinsForAttempt,
  revealedDetail,
  successMessage,
} from "@/shared/lib/game/utils/rewards"

type ChallengeRunOptions = {
  profile: DifficultyProfile
  rewardsEnabled: boolean
  correctAnswer: string
  onSolved: (outcome: ChallengeOutcome) => void
  solvedOutcome?: ChallengeOutcome
}

export function useChallengeRun({
  profile,
  rewardsEnabled,
  correctAnswer,
  onSolved,
  solvedOutcome,
}: ChallengeRunOptions) {
  const [wrongAttempts, setWrongAttempts] = useState(
    solvedOutcome?.wrongAttempts ?? 0,
  )
  const [hint, setHint] = useState<string | null>(null)
  const [hintUsed, setHintUsed] = useState(solvedOutcome?.hintUsed ?? false)
  const [solved, setSolved] = useState(Boolean(solvedOutcome))
  const [feedback, setFeedback] = useState<ChallengeFeedback | null>(
    solvedOutcome
      ? {
          tone: "info",
          message: "Ya superaste esta prueba.",
          detail: correctAnswer,
        }
      : null,
  )

  function registerSuccess() {
    playSound("correct")
    setSolved(true)
    onSolved({
      reward: coinsForAttempt(wrongAttempts, profile),
      wrongAttempts,
      hintUsed,
      revealed: false,
    })
    setFeedback({
      tone: "success",
      message: successMessage(wrongAttempts, rewardsEnabled, profile),
      detail: correctAnswer,
    })
  }

  function registerMistake(message: string) {
    playSound("incorrect")
    const attempts = wrongAttempts + 1
    setWrongAttempts(attempts)

    if (attempts >= profile.attemptsBeforeReveal) {
      setSolved(true)
      onSolved({
        reward: 0,
        wrongAttempts: attempts,
        hintUsed,
        revealed: true,
      })
      setFeedback({
        tone: "error",
        message: `La respuesta era: ${correctAnswer}`,
        detail: revealedDetail(rewardsEnabled),
      })
      return
    }

    const left = profile.attemptsBeforeReveal - attempts
    setFeedback({
      tone: "error",
      message,
      detail: left === 1 ? "Te queda 1 intento." : `Te quedan ${left} intentos.`,
    })
  }

  function applyHint(text: string) {
    setHint(text)
    setHintUsed(true)
  }

  function clearFeedback() {
    setFeedback(null)
  }

  return {
    wrongAttempts,
    solved,
    feedback,
    hint,
    applyHint,
    registerSuccess,
    registerMistake,
    clearFeedback,
  }
}
