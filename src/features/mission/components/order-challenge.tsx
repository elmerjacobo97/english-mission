"use client"

import { useState } from "react"
import type { OrderChallenge as OrderChallengeType } from "../types/beat"
import { checkOrderedAnswer } from "../utils/answer-check"
import {
  HINT_COST,
  MAX_ATTEMPTS,
  coinsForAttempt,
  hintForOrder,
  revealedDetail,
  successMessage,
} from "../utils/rewards"
import { ChallengeFrame, type ChallengeFeedback } from "./challenge-frame"

type OrderChallengeProps = {
  beat: OrderChallengeType
  coins: number
  rewardsEnabled: boolean
  onSpendCoins: (amount: number) => boolean
  onSolved: (reward: number) => void
  onContinue: () => void
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
  onSpendCoins,
  onSolved,
  onContinue,
}: OrderChallengeProps) {
  const [placed, setPlaced] = useState<string[]>([])
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [feedback, setFeedback] = useState<ChallengeFeedback | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)

  const available = rebuildAvailable(beat.tokens, placed)
  const complete = placed.length === beat.solution.length

  function handlePlace(token: string) {
    if (solved) {
      return
    }
    setPlaced((current) => [...current, token])
    setFeedback(null)
  }

  function handleRemove(index: number) {
    if (solved) {
      return
    }
    setPlaced((current) => current.filter((_, i) => i !== index))
    setFeedback(null)
  }

  function handleRequestHint() {
    if (hint || solved) {
      return
    }
    if (!onSpendCoins(HINT_COST)) {
      return
    }
    const attempt: (string | null)[] = [
      ...placed,
      ...Array.from({ length: beat.solution.length - placed.length }, () => null),
    ]
    const reveal = hintForOrder(beat, attempt)
    if (!reveal) {
      return
    }
    setPlaced(beat.solution.slice(0, reveal.position + 1))
    setHint(`La palabra ${reveal.position + 1} es «${reveal.token}».`)
  }

  function handleCheck() {
    if (solved || !complete) {
      return
    }
    if (checkOrderedAnswer(placed, beat.solution)) {
      setSolved(true)
      onSolved(coinsForAttempt(wrongAttempts))
      setFeedback({
        tone: "success",
        message: successMessage(wrongAttempts, rewardsEnabled),
        detail: beat.solution.join(" "),
      })
      return
    }

    const attempts = wrongAttempts + 1
    setWrongAttempts(attempts)
    if (attempts >= MAX_ATTEMPTS) {
      setSolved(true)
      setPlaced(beat.solution)
      onSolved(0)
      setFeedback({
        tone: "error",
        message: `La frase era: ${beat.solution.join(" ")}`,
        detail: revealedDetail(rewardsEnabled),
      })
      return
    }
    setFeedback({
      tone: "error",
      message: "El orden no es correcto. Inténtalo otra vez.",
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
      <div className="flex flex-col gap-4">
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
              disabled={solved}
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
              disabled={solved}
              className="min-h-11 rounded-xl border-2 border-ink/10 bg-surface px-3 py-2 font-display font-semibold transition hover:border-accent hover:bg-paper disabled:opacity-40"
            >
              {token}
            </button>
          ))}
        </div>

        {!solved && (
          <button
            type="button"
            onClick={handleCheck}
            disabled={!complete}
            className="min-h-12 self-start rounded-2xl bg-accent-strong px-5 font-display font-semibold text-white shadow-pop transition active:translate-y-0.5 disabled:opacity-40 disabled:shadow-none"
          >
            Comprobar
          </button>
        )}
      </div>
    </ChallengeFrame>
  )
}
