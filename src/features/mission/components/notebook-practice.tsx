"use client"

import { ArrowLeft, ArrowRight, SpeakerHigh } from "@phosphor-icons/react"
import { useMemo, useState, useSyncExternalStore } from "react"
import { ChoiceChallenge } from "@/shared/components/game/choice-challenge"
import { TypeChallenge } from "@/shared/components/game/type-challenge"
import { profileFor } from "@/shared/lib/game/utils/difficulty"
import type { ReviewBox } from "@/shared/lib/progress/types"
import { buildPracticeChallenge } from "@/shared/lib/review/review-exercise"
import type { ReviewWord } from "@/shared/lib/review/review-queue"
import {
  getSpeechSupportServerSnapshot,
  getSpeechSupportSnapshot,
  speak,
  subscribeSpeechSupport,
} from "@/shared/lib/speech"

type NotebookPracticeProps = {
  word: ReviewWord & { box: ReviewBox }
  pool: ReviewWord[]
  onExit: () => void
}

export function NotebookPractice({ word, pool, onExit }: NotebookPracticeProps) {
  const speechAvailable = useSyncExternalStore(
    subscribeSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  )
  const [solved, setSolved] = useState(false)
  const { challenge, speakText } = useMemo(
    () => buildPracticeChallenge(word, pool, speechAvailable),
    [word, pool, speechAvailable],
  )
  const shared = {
    coins: 0,
    rewardsEnabled: false,
    freeHints: true,
    profile: profileFor(word.level),
    onSpendCoins: () => false,
    onSolved: () => setSolved(true),
    onContinue: onExit,
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          className="flex min-h-11 items-center gap-1.5 rounded-2xl border-2 border-ink/10 bg-surface px-3.5 font-display text-sm font-semibold text-muted shadow-card transition hover:text-ink"
        >
          <ArrowLeft weight="bold" size={16} aria-hidden />
          Volver
        </button>
        <p className="truncate font-display text-sm font-semibold text-muted">
          Práctica · {word.en}
        </p>
      </header>

      {speakText !== null && (
        <button
          type="button"
          onClick={() => speak(speakText)}
          className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-teal/30 bg-paper px-5 font-display font-semibold text-teal-strong shadow-card transition hover:-translate-y-0.5"
        >
          <SpeakerHigh weight="fill" size={20} aria-hidden />
          Escuchar
        </button>
      )}

      {challenge.kind === "choice" && (
        <ChoiceChallenge beat={challenge} {...shared} />
      )}
      {challenge.kind === "type" && <TypeChallenge beat={challenge} {...shared} />}

      <div className="grid grid-cols-3 items-center gap-2">
        <span />
        <span className="justify-self-center font-display text-xs font-semibold text-muted">
          Un reto suelto
        </span>
        {solved ? (
          <button
            type="button"
            onClick={onExit}
            className="animate-pop flex min-h-11 items-center gap-1.5 justify-self-end rounded-2xl bg-accent-strong px-4 font-display text-sm font-semibold text-white shadow-pop transition active:translate-y-0.5"
          >
            Continuar
            <ArrowRight weight="bold" size={16} aria-hidden />
          </button>
        ) : challenge.kind === "type" ? (
          <button
            type="submit"
            form="challenge-form"
            className="flex min-h-11 items-center gap-1.5 justify-self-end rounded-2xl bg-accent-strong px-4 font-display text-sm font-semibold text-white shadow-pop transition active:translate-y-0.5"
          >
            Comprobar
          </button>
        ) : (
          <span />
        )}
      </div>
    </section>
  )
}
