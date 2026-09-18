"use client"

import { useState } from "react"
import { useChallengeRun } from "../hooks/use-challenge-run"
import type { TypeChallenge as TypeChallengeType } from "../types/beat"
import { checkTypedAnswer } from "../utils/answer-check"
import { hintForType } from "../utils/rewards"
import type { ChallengeProps } from "./challenge-props"
import { ChallengeFrame } from "./challenge-frame"

type TypeChallengeProps = ChallengeProps & {
  beat: TypeChallengeType
}

export function TypeChallenge({
  beat,
  coins,
  rewardsEnabled,
  profile,
  solvedOutcome,
  onSpendCoins,
  onSolved,
  onContinue,
}: TypeChallengeProps) {
  const run = useChallengeRun({
    profile,
    rewardsEnabled,
    solvedOutcome,
    correctAnswer: beat.accepted[0],
    onSolved,
  })
  const [value, setValue] = useState("")

  function handleRequestHint() {
    if (run.hint || run.solved) {
      return
    }
    if (!onSpendCoins(profile.hintCost)) {
      return
    }
    run.applyHint(hintForType(beat))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (run.solved) {
      return
    }

    const result = checkTypedAnswer(value, beat.accepted, profile.typoTolerance)
    if (result.ok) {
      run.registerSuccess()
      return
    }
    run.registerMistake(
      result.wrongWord
        ? `La palabra «${result.wrongWord}» no es correcta.`
        : "Revisa la frase e inténtalo otra vez.",
    )
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
      note={beat.note}
      onRequestHint={handleRequestHint}
      onContinue={run.solved ? onContinue : undefined}
    >
      <form
        id="challenge-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-3"
      >
        <label htmlFor="typed-answer" className="sr-only">
          Tu respuesta en inglés
        </label>
        <input
          id="typed-answer"
          type="text"
          value={run.solved ? beat.accepted[0] : value}
          onChange={(event) => setValue(event.target.value)}
          disabled={run.solved}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          required
          placeholder="Escribe en inglés..."
          className="min-h-14 rounded-2xl border-2 border-ink/10 bg-surface px-4 py-3.5 font-display text-lg font-semibold transition focus:border-teal focus:outline-none disabled:bg-ink/5"
        />
      </form>
    </ChallengeFrame>
  )
}
