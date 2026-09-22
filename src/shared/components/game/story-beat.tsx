"use client"

import { EyeIcon, SpeakerHighIcon } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import { speak, stopSpeaking } from "@/shared/lib/speech"
import { CHARACTERS } from "@/shared/lib/game/content/characters"
import type { StoryBeat as StoryBeatData } from "@/shared/lib/game/types/beat"
import { CharacterAvatar } from "./character-avatar"
import { GrammarNote } from "./grammar-note"
import { InteractiveVocabulary } from "./interactive-vocabulary"

type StoryBeatProps = {
  beat: StoryBeatData
  speechAvailable: boolean
  englishVisible: boolean
}

export function StoryBeat({
  beat,
  speechAvailable,
  englishVisible,
}: StoryBeatProps) {
  const [revealed, setRevealed] = useState(englishVisible)
  useEffect(() => stopSpeaking, [])

  const showText = englishVisible || revealed
  const isYou = beat.speaker === "you"
  const speakerId =
    beat.speaker && beat.speaker !== "you" ? beat.speaker : null
  const speaker = speakerId ? CHARACTERS[speakerId] : null

  return (
    <section className="flex flex-col gap-5 rounded-3xl border-2 border-ink/10 bg-surface p-6 shadow-card">
      <p className="text-lg font-semibold leading-relaxed">{beat.es}</p>

      {beat.en && (
        <div className="flex justify-start">
          <div
            className={`max-w-[94%] rounded-3xl border-2 p-4 ${
              isYou
                ? "border-accent/30 bg-paper"
                : "border-teal/25 bg-teal-soft"
            }`}
          >
            <div className="flex items-center gap-3">
              {speechAvailable && (
                <button
                  type="button"
                  onClick={() => speak(beat.en ?? "")}
                  aria-label="Reproducir en inglés"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-strong text-white shadow-pop transition active:translate-y-0.5"
                >
                  <SpeakerHighIcon weight="fill" size={22} aria-hidden />
                </button>
              )}
              <span className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5">
                  {speakerId && (
                    <CharacterAvatar character={speakerId} size={20} />
                  )}
                  <span
                    className={`font-display text-xs font-semibold uppercase tracking-widest ${
                      isYou ? "text-accent-deep" : "text-teal-strong"
                    }`}
                  >
                    {isYou ? "Tú dices" : `${speaker?.name} dice`}
                  </span>
                </span>
                {showText ? (
                  <p
                    className={`font-display text-lg font-semibold ${
                      isYou ? "text-ink" : "text-teal-strong"
                    }`}
                  >
                    «
                    <InteractiveVocabulary
                      text={beat.en}
                      vocabulary={beat.vocab ?? []}
                      speechAvailable={speechAvailable}
                    />
                    »
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="flex min-h-11 items-center gap-2 self-start rounded-2xl border-2 border-teal/30 bg-surface px-4 font-display text-sm font-semibold text-teal-strong"
                  >
                    <EyeIcon weight="bold" size={18} aria-hidden />
                    Ver texto
                  </button>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {beat.note && <GrammarNote note={beat.note} />}
    </section>
  )
}
