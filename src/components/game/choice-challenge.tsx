"use client"

import { useState } from "react"
import { useChallengeRun } from "../hooks/use-challenge-run"
import type { ChoiceChallenge as ChoiceChallengeType } from "../types/beat"
import { hintForOption } from "../utils/rewards"
import type { ChallengeProps } from "./challenge-props"
import { ChallengeFrame } from "./challenge-frame"

type ChoiceChallengeProps = ChallengeProps & {
  beat: ChoiceChallengeType
}

export function ChoiceChallenge({
  beat,
  coins,
  rewardsEnabled,
  freeHints,
  profile,
  solvedOutcome,
  onSpendCoins,
  onSolved,
  onContinue,
}: ChoiceChallengeProps) {
  const run = useChallengeRun({
    profile,
    rewardsEnabled,
    solvedOutcome,
    correctAnswer: beat.options[beat.correct],
    onSolved,
  })
  const [hiddenOption, setHiddenOption] = useState<number | null>(null)

  function handleRequestHint() {
    if (run.hint || run.solved) {
      return
    }
    if (!freeHints && !onSpendCoins(profile.hintCost)) {
      return
    }
    setHiddenOption(hintForOption(beat))
    run.applyHint("Eliminé una opción incorrecta.")
  }

  function handleChoose(option: number) {
    if (run.solved || option === hiddenOption) {
      return
    }
    if (option === beat.correct) {
      run.registerSuccess()
      return
    }
    run.registerMistake("Todavía no. Inténtalo otra vez.")
  }

  return (
    <ChallengeFrame
      prompt={beat.prompt}
      wrongAttempts={run.wrongAttempts}
      maxAttempts={profile.attemptsBeforeReveal}
      feedback={run.feedback}
      hint={run.hint}
      hintCost={profile.hintCost}
      coins={coins}
      freeHints={freeHints}
      note={beat.note}
      onRequestHint={handleRequestHint}
      onContinue={run.solved ? onContinue : undefined}
    >
      <div className="flex flex-col gap-2.5">
        {beat.options.map((option, index) => {
          const isHidden = index === hiddenOption
          const isCorrect = run.solved && index === beat.correct
          return (
            <button
              key={option}
              type="button"
              onClick={() => handleChoose(index)}
              disabled={run.solved || isHidden}
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
