"use client"

import { useState } from "react"
import { useChallengeRun } from "@/shared/hooks/use-challenge-run"
import type { OrderChallenge as OrderChallengeType } from "@/shared/lib/game/types/beat"
import { checkOrderedAnswer } from "@/shared/lib/game/utils/answer-check"
import { hintForOrder } from "@/shared/lib/game/utils/rewards"
import type { ChallengeProps } from "./challenge-props"
import { ChallengeFrame } from "./challenge-frame"

type OrderChallengeProps = ChallengeProps & {
  beat: OrderChallengeType
}

function rebuildAvailable(tokens: string[], placed: string[]): string[] {
  const used = [...placed]
  return tokens.filter((token) => {
    const index = used.indexOf(token)
    if (index === -1) {
      return true
    }
    used.splice(index, 1)
    return false
  })
}

export function OrderChallenge({
  beat,
  coins,
  rewardsEnabled,
  profile,
  solvedOutcome,
  onSpendCoins,
  onSolved,
  onContinue,
}: OrderChallengeProps) {
  const run = useChallengeRun({
    profile,
    rewardsEnabled,
    solvedOutcome,
    correctAnswer: beat.solution.join(" "),
    onSolved,
  })
  const [placed, setPlaced] = useState<string[]>(
    solvedOutcome ? beat.solution : [],
  )
  const [incompleteSubmit, setIncompleteSubmit] = useState(false)

  const available = rebuildAvailable(beat.tokens, placed)
  const complete = placed.length === beat.solution.length

  function handlePlace(token: string) {
    if (run.solved) {
      return
    }
    setPlaced((current) => [...current, token])
    run.clearFeedback()
  }

  function handleRemove(index: number) {
    if (run.solved) {
      return
    }
    setPlaced((current) => current.filter((_, i) => i !== index))
    run.clearFeedback()
  }

  function handleRequestHint() {
    if (run.hint || run.solved) {
      return
    }
    const attempt: (string | null)[] = [
      ...placed,
      ...Array.from(
        { length: beat.solution.length - placed.length },
        () => null,
      ),
    ]
    const reveal = hintForOrder(beat, attempt)
    if (!reveal || !onSpendCoins(profile.hintCost)) {
      return
    }
    setPlaced(beat.solution.slice(0, reveal.position + 1))
    run.applyHint(`La palabra ${reveal.position + 1} es «${reveal.token}».`)
  }

  function handleCheck() {
    if (run.solved) {
      return
    }
    if (!complete) {
      setIncompleteSubmit(true)
      return
    }
    setIncompleteSubmit(false)
    if (checkOrderedAnswer(placed, beat.solution)) {
      run.registerSuccess()
      return
    }
    const isLastAttempt =
      run.wrongAttempts + 1 >= profile.attemptsBeforeReveal
    if (isLastAttempt) {
      setPlaced(beat.solution)
    }
    run.registerMistake("El orden no es correcto. Inténtalo otra vez.")
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
        onSubmit={(event) => {
          event.preventDefault()
          handleCheck()
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex min-h-16 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 bg-paper p-3">
          {placed.length === 0 && (
            <span className="text-sm font-semibold text-muted">
              Toca las palabras en orden
            </span>
          )}
          {placed.map((token, index) => (
            <button
              key={`${token}-${index}`}
              type="button"
              onClick={() => handleRemove(index)}
              disabled={run.solved}
              className="rounded-xl bg-accent-strong px-3 py-2 font-display font-semibold text-white shadow-pop"
            >
              {token}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {available.map((token, index) => (
            <button
              key={`${token}-${index}`}
              type="button"
              onClick={() => handlePlace(token)}
              disabled={run.solved}
              className="min-h-11 rounded-xl border-2 border-ink/10 bg-surface px-3 py-2 font-display font-semibold transition hover:border-accent hover:bg-paper disabled:opacity-40"
            >
              {token}
            </button>
          ))}
        </div>

        {incompleteSubmit && (
          <p className="text-sm font-semibold text-muted">
            Coloca todas las palabras antes de comprobar.
          </p>
        )}
      </form>
    </ChallengeFrame>
  )
}
