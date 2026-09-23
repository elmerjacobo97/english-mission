"use client"

import { useState } from "react"
import { useChallengeRun } from "@/shared/hooks/use-challenge-run"
import type { ChoiceChallenge as ChoiceChallengeType } from "@/shared/lib/game/types/beat"
import { hintForOption } from "@/shared/lib/game/utils/rewards"
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
              className={`ui-choice-option ${
                isCorrect ? "ui-choice-option-correct" : "ui-choice-option-idle"
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
