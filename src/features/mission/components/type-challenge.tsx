"use client"

import { useState } from "react"
import type { TypeChallenge as TypeChallengeType } from "../types/beat"
import { checkTypedAnswer } from "../utils/answer-check"
import {
  HINT_COST,
  MAX_ATTEMPTS,
  coinsForAttempt,
  hintForType,
  revealedDetail,
  successMessage,
} from "../utils/rewards"
import { ChallengeFrame, type ChallengeFeedback } from "./challenge-frame"

type TypeChallengeProps = {
  beat: TypeChallengeType
  coins: number
  rewardsEnabled: boolean
  onSpendCoins: (amount: number) => boolean
  onSolved: (reward: number) => void
  onContinue: () => void
}

export function TypeChallenge({
  beat,
  coins,
  rewardsEnabled,
  onSpendCoins,
  onSolved,
  onContinue,
}: TypeChallengeProps) {
  const [value, setValue] = useState("")
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [feedback, setFeedback] = useState<ChallengeFeedback | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)

  function handleRequestHint() {
    if (hint || solved) {
      return
    }
    if (!onSpendCoins(HINT_COST)) {
      return
    }
    setHint(hintForType(beat))
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (solved) {
      return
    }

    const result = checkTypedAnswer(value, beat.accepted)
    if (result.ok) {
      setSolved(true)
      onSolved(coinsForAttempt(wrongAttempts))
      setFeedback({
        tone: "success",
        message: successMessage(wrongAttempts, rewardsEnabled),
        detail: beat.accepted[0],
      })
      return
    }

    const attempts = wrongAttempts + 1
    setWrongAttempts(attempts)
    if (attempts >= MAX_ATTEMPTS) {
      setSolved(true)
      setValue(beat.accepted[0])
      onSolved(0)
      setFeedback({
        tone: "error",
        message: `La respuesta era: ${beat.accepted[0]}`,
        detail: revealedDetail(rewardsEnabled),
      })
      return
    }
    setFeedback({
      tone: "error",
      message: result.wrongWord
        ? `La palabra «${result.wrongWord}» no es correcta.`
        : "Revisa la frase e inténtalo otra vez.",
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="typed-answer" className="sr-only">
          Tu respuesta en inglés
        </label>
        <input
          id="typed-answer"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={solved}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Escribe en inglés..."
          className="min-h-14 rounded-2xl border-2 border-ink/10 bg-surface px-4 py-3.5 font-display text-lg font-semibold transition focus:border-teal focus:outline-none disabled:bg-ink/5"
        />
        {!solved && (
          <button
            type="submit"
            disabled={value.trim().length === 0}
            className="min-h-12 self-start rounded-2xl bg-accent-strong px-5 font-display font-semibold text-white shadow-pop transition active:translate-y-0.5 disabled:opacity-40 disabled:shadow-none"
          >
            Comprobar
          </button>
        )}
      </form>
    </ChallengeFrame>
  )
}
