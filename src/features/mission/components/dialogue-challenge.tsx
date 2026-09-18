"use client"

import { SpeakerHigh } from "@phosphor-icons/react"
import { useState } from "react"
import { speak } from "@/lib/speech"
import { useChallengeRun } from "../hooks/use-challenge-run"
import type { DialogueChallenge as DialogueChallengeType } from "../types/beat"
import { hintForOption } from "../utils/rewards"
import type { ChallengeProps } from "./challenge-props"
import { ChallengeFrame } from "./challenge-frame"
import { CharacterAvatar } from "./character-avatar"

type DialogueChallengeProps = ChallengeProps & {
  beat: DialogueChallengeType
}

export function DialogueChallenge({
  beat,
  coins,
  rewardsEnabled,
  profile,
  solvedOutcome,
  speechAvailable = false,
  onSpendCoins,
  onSolved,
  onContinue,
}: DialogueChallengeProps) {
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
    if (!onSpendCoins(profile.hintCost)) {
      return
    }
    setHiddenOption(hintForOption(beat))
    run.applyHint("Eliminé una respuesta incorrecta.")
  }

  function handleChoose(option: number) {
    if (run.solved || option === hiddenOption) {
      return
    }
    if (option === beat.correct) {
      run.registerSuccess()
      return
    }
    run.registerMistake("Esa respuesta no encaja en la conversación.")
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
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-2.5">
          {beat.character && (
            <CharacterAvatar
              character={beat.character}
              mood={beat.mood}
              size={46}
              className="shrink-0"
            />
          )}
        <div className="relative flex-1 rounded-3xl rounded-bl-md border-2 border-teal/25 bg-teal-soft p-4 pb-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => speak(beat.line)}
              aria-label="Reproducir la frase"
              disabled={!speechAvailable}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-strong text-white shadow-pop transition active:translate-y-0.5 disabled:hidden"
            >
              <SpeakerHigh weight="fill" size={22} aria-hidden />
            </button>
            <p className="font-display text-lg font-semibold text-teal-strong">
              «{beat.line}»
            </p>
          </div>
          <span
            aria-hidden
            className="absolute -bottom-[9px] left-10 h-4 w-4 rotate-45 border-b-2 border-l-2 border-teal/25 bg-teal-soft"
          />
        </div>
        </div>

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
      </div>
    </ChallengeFrame>
  )
}
