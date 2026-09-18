"use client"

import { useState } from "react"
import type { ChoiceChallenge as ChoiceChallengeType } from "../types/beat"
import {
  HINT_COST,
  MAX_ATTEMPTS,
  coinsForAttempt,
  hintForChoice,
  revealedDetail,
  successMessage,
} from "../utils/rewards"
import { ChallengeFrame, type ChallengeFeedback } from "./challenge-frame"

type ChoiceChallengeProps = {
  beat: ChoiceChallengeType
  coins: number
  rewardsEnabled: boolean
  onSpendCoins: (amount: number) => boolean
  onSolved: (reward: number) => void
  onContinue: () => void
}

export function ChoiceChallenge({
  beat,
  coins,
  rewardsEnabled,
  onSpendCoins,
  onSolved,
  onContinue,
}: ChoiceChallengeProps) {
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [feedback, setFeedback] = useState<ChallengeFeedback | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hiddenOption, setHiddenOption] = useState<number | null>(null)
  const [solved, setSolved] = useState(false)

  function handleRequestHint() {
    if (hint || solved) {
      return
    }
    if (!onSpendCoins(HINT_COST)) {
      return
    }
    setHiddenOption(hintForChoice(beat))
    setHint("Eliminé una opción incorrecta.")
  }

  function handleChoose(option: number) {
    if (solved || option === hiddenOption) {
      return
    }
    if (option === beat.correct) {
      setSolved(true)
      onSolved(coinsForAttempt(wrongAttempts))
      setFeedback({
        tone: "success",
        message: successMessage(wrongAttempts, rewardsEnabled),
        detail: beat.options[beat.correct],
      })
      return
    }

    const attempts = wrongAttempts + 1
    setWrongAttempts(attempts)
    if (attempts >= MAX_ATTEMPTS) {
      setSolved(true)
      onSolved(0)
      setFeedback({
        tone: "error",
        message: `La respuesta era: ${beat.options[beat.correct]}`,
        detail: revealedDetail(rewardsEnabled),
      })
      return
    }
    setFeedback({
      tone: "error",
      message: "Todavía no. Inténtalo otra vez.",
      detail: `Te quedan ${MAX_ATTEMPTS - attempts} intentos.`,
    })
  }

  return (
    <ChallengeFrame
      prompt={beat.prompt}
      wrongAttempts={wrongAttempts}
      feedback={feedback}
      hint={hint}
      hintCost={HINT_COST}
      coins={coins}
      onRequestHint={handleRequestHint}
      onContinue={solved ? onContinue : undefined}
    >
      <div className="flex flex-col gap-2.5">
        {beat.options.map((option, index) => {
          const isHidden = index === hiddenOption
          const isCorrect = solved && index === beat.correct
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleChoose(index)}
              disabled={solved || isHidden}
              className={`flex min-h-14 items-center rounded-2xl border-2 px-4 py-3.5 text-left font-display text-lg font-semibold transition ${
                isCorrect
                  ? "border-success/30 bg-success-soft text-success"
                  : "border-ink/10 bg-surface hover:border-accent hover:bg-paper"
              } ${isHidden ? "invisible" : ""}`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </ChallengeFrame>
  )
}
