"use client"

import { ArrowRight, Eye, SpeakerHigh } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import { speak, stopSpeaking } from "@/lib/speech"
import type { StoryBeat as StoryBeatData } from "../types/beat"

type StoryBeatProps = {
  beat: StoryBeatData
  speechAvailable: boolean
  englishVisible: boolean
  onContinue: () => void
}

export function StoryBeat({
  beat,
  speechAvailable,
  englishVisible,
  onContinue,
}: StoryBeatProps) {
  const [revealed, setRevealed] = useState(englishVisible)
  useEffect(() => stopSpeaking, [])

  const showText = englishVisible || revealed

  return (
    <section className="flex flex-col gap-5 rounded-3xl border-2 border-ink/10 bg-surface p-6 shadow-card">
      <p className="text-lg font-semibold leading-relaxed">{beat.es}</p>

      {beat.en && (
        <div className="relative rounded-3xl rounded-bl-md border-2 border-teal/25 bg-teal-soft p-4 pb-5">
          <div className="flex items-center gap-3">
            {speechAvailable && (
              <button
                type="button"
                onClick={() => speak(beat.en ?? "")}
                aria-label="Reproducir en inglés"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-strong text-white shadow-pop transition active:translate-y-0.5"
              >
                <SpeakerHigh weight="fill" size={22} aria-hidden />
              </button>
            )}
            {showText ? (
              <p className="font-display text-lg font-semibold text-teal-strong">
                «{beat.en}»
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="flex min-h-11 items-center gap-2 rounded-2xl border-2 border-teal/30 bg-surface px-4 font-display text-sm font-semibold text-teal-strong"
              >
                <Eye weight="bold" size={18} aria-hidden />
                Ver texto
              </button>
            )}
          </div>
          <span
            aria-hidden
            className="absolute -bottom-[9px] left-10 h-4 w-4 rotate-45 border-b-2 border-l-2 border-teal/25 bg-teal-soft"
          />
        </div>
      )}

      {beat.vocab && beat.vocab.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {beat.vocab.map(([en, es]) => (
            <li key={en}>
              {speechAvailable ? (
                <button
                  type="button"
                  onClick={() => speak(en)}
                  aria-label={`Escuchar ${en}`}
                  className="flex min-h-9 items-center gap-1.5 rounded-full border-2 border-teal/25 bg-white px-3 py-1.5 text-sm font-semibold transition hover:border-teal"
                >
                  <span className="font-display text-teal-strong">{en}</span>
                  <span className="text-muted">· {es}</span>
                  <SpeakerHigh size={13} className="text-teal" aria-hidden />
                </button>
              ) : (
                <span className="flex min-h-9 items-center gap-1.5 rounded-full border-2 border-teal/25 bg-white px-3 py-1.5 text-sm font-semibold">
                  <span className="font-display text-teal-strong">{en}</span>
                  <span className="text-muted">· {es}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="flex min-h-12 items-center gap-2 self-start rounded-2xl bg-accent-strong px-5 font-display font-semibold text-white shadow-pop transition active:translate-y-0.5"
      >
        Continuar
        <ArrowRight weight="bold" size={18} aria-hidden />
      </button>
    </section>
  )
}
