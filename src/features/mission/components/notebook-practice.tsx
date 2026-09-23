"use client"

import { ArrowLeftIcon, ArrowRightIcon, SpeakerHighIcon } from "@phosphor-icons/react"
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
          className="ui-button ui-button-secondary px-3.5"
        >
          <ArrowLeftIcon weight="bold" size={16} aria-hidden />
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
          className="ui-button ui-button-quiet w-full px-5"
        >
          <SpeakerHighIcon weight="fill" size={20} aria-hidden />
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
            className="ui-button ui-button-primary animate-pop justify-self-end"
          >
            Continuar
            <ArrowRightIcon weight="bold" size={16} aria-hidden />
          </button>
        ) : challenge.kind === "type" ? (
          <button
            type="submit"
            form="challenge-form"
            className="ui-button ui-button-primary justify-self-end"
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
