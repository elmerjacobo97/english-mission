"use client"

import { SpeakerHigh } from "@phosphor-icons/react"
import { useState } from "react"
import { speak } from "@/shared/lib/speech"
import { useChallengeRun } from "@/shared/hooks/use-challenge-run"
import type { ListenChallenge as ListenChallengeType } from "@/shared/lib/game/types/beat"
import { hintForOption } from "@/shared/lib/game/utils/rewards"
import type { ChallengeProps } from "./challenge-props"
import { ChallengeFrame } from "./challenge-frame"
import { CharacterAvatar } from "./character-avatar"

type ListenChallengeProps = ChallengeProps & {
  beat: ListenChallengeType
}

export function ListenChallenge({
  beat,
  coins,
  rewardsEnabled,
  freeHints,
  profile,
  solvedOutcome,
  speechAvailable = false,
  onSpendCoins,
  onSolved,
  onContinue,
}: ListenChallengeProps) {
  const run = useChallengeRun({
    profile,
    rewardsEnabled,
    solvedOutcome,
    correctAnswer: beat.phrase,
    onSolved,
  })
  const [played, setPlayed] = useState(false)
  const [hiddenOption, setHiddenOption] = useState<number | null>(null)

  const optionsEnabled = !speechAvailable || played

  function handlePlay() {
    speak(beat.phrase)
    setPlayed(true)
  }

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
    if (run.solved || option === hiddenOption || !optionsEnabled) {
      return
    }
    if (option === beat.correct) {
      run.registerSuccess()
      return
    }
    run.registerMistake("Eso no es lo que se dijo. Escúchalo otra vez.")
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
      <div className="flex flex-col gap-3">
        {speechAvailable ? (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-teal/25 bg-teal-soft p-4">
            {beat.character && (
              <CharacterAvatar
                character={beat.character}
                mood={beat.mood}
                size={42}
                className="shrink-0"
              />
            )}
            <button
              type="button"
              onClick={handlePlay}
              aria-label="Reproducir la frase"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-strong text-white shadow-pop transition active:translate-y-0.5"
            >
              <SpeakerHigh weight="fill" size={22} aria-hidden />
            </button>
            <p className="text-sm font-semibold text-teal-strong">
              {played
                ? "Puedes repetirlo todas las veces que quieras."
                : "Toca para escuchar. Las opciones se activan después."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 rounded-2xl border-2 border-accent/25 bg-paper p-4">
            <p className="font-display text-lg font-semibold">
              «{beat.phrase}»
            </p>
            <p className="text-xs font-semibold text-muted">
              Tu navegador no reproduce voz: lee la frase y elige.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {beat.options.map((option, index) => {
            const isHidden = index === hiddenOption
            const isCorrect = run.solved && index === beat.correct
            return (
              <button
                key={option}
                type="button"
                onClick={() => handleChoose(index)}
                disabled={run.solved || isHidden || !optionsEnabled}
                className={`flex min-h-14 items-center rounded-2xl border-2 px-4 py-3.5 text-left font-display text-lg font-semibold transition ${
                  isCorrect
                    ? "border-success/30 bg-success-soft text-success"
                    : "border-ink/10 bg-surface hover:border-accent hover:bg-paper"
                } ${isHidden ? "invisible" : ""} ${
                  !optionsEnabled ? "opacity-50" : ""
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>
    </ChallengeFrame>
  )
}
