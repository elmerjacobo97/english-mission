"use client"

import { useRef, useState } from "react"
import { useChallengeRun } from "@/shared/hooks/use-challenge-run"
import type { FillChallenge as FillChallengeType } from "@/shared/lib/game/types/beat"
import { checkTypedAnswer } from "@/shared/lib/game/utils/answer-check"
import { hintForFill } from "@/shared/lib/game/utils/rewards"
import type { ChallengeProps } from "./challenge-props"
import { ChallengeFrame } from "./challenge-frame"

type FillChallengeProps = ChallengeProps & {
  beat: FillChallengeType
}

export function FillChallenge({
  beat,
  coins,
  rewardsEnabled,
  profile,
  solvedOutcome,
  onSpendCoins,
  onSolved,
  onContinue,
}: FillChallengeProps) {
  const accepted = [beat.answer, ...(beat.alternatives ?? [])]
  const run = useChallengeRun({
    profile,
    rewardsEnabled,
    solvedOutcome,
    correctAnswer: beat.answer,
    onSolved,
  })
  const [value, setValue] = useState("")
  const [emptySubmit, setEmptySubmit] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [before, after] = beat.sentence.split("___")

  function handleRequestHint() {
    if (run.hint || run.solved) {
      return
    }
    if (!onSpendCoins(profile.hintCost)) {
      return
    }
    run.applyHint(`La palabra empieza por «${hintForFill(beat)}».`)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (run.solved) {
      return
    }
    if (value.trim().length === 0) {
      setEmptySubmit(true)
      inputRef.current?.focus()
      return
    }
    setEmptySubmit(false)
    const result = checkTypedAnswer(value, accepted, profile.typoTolerance)
    if (result.ok) {
      run.registerSuccess()
      return
    }
    run.registerMistake("Esa palabra no completa la frase. Prueba otra vez.")
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
        <p className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-ink/10 bg-paper px-4 py-3 font-display text-lg font-semibold">
          <span>{before}</span>
          <label htmlFor="fill-answer" className="sr-only">
            Palabra que falta
          </label>
          <input
            id="fill-answer"
            ref={inputRef}
            type="text"
            value={run.solved ? beat.answer : value}
            onChange={(event) => {
              setValue(event.target.value)
              setEmptySubmit(false)
            }}
            disabled={run.solved}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            size={Math.max(beat.answer.length + 2, 8)}
            className="rounded-xl border-2 border-teal/40 bg-surface px-3 py-1.5 text-center font-display text-lg font-semibold transition focus:border-teal focus:outline-none disabled:bg-ink/5"
          />
          <span>{after}</span>
        </p>
        {emptySubmit && (
          <p className="animate-slide-in text-sm font-semibold text-muted">
            Escribe la palabra que falta antes de comprobar.
          </p>
        )}
      </form>
    </ChallengeFrame>
  )
}
