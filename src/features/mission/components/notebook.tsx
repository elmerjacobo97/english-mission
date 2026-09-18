"use client"

import { ArrowLeft, BookOpenText, SpeakerHigh } from "@phosphor-icons/react"
import Link from "next/link"
import { useSyncExternalStore } from "react"
import { useProgress } from "@/lib/progress/use-progress"
import {
  getSpeechSupportServerSnapshot,
  getSpeechSupportSnapshot,
  speak,
  subscribeSpeechSupport,
} from "@/lib/speech"
import { CHAPTER_TITLES, chapterEntries } from "../content/mission-catalog"
import type { Chapter } from "../types/mission"

const CHAPTERS: Chapter[] = [1, 2, 3]

export function Notebook() {
  const { progress } = useProgress()
  const speechAvailable = useSyncExternalStore(
    subscribeSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  )

  const seen = new Set<string>()
  const sections = CHAPTERS.map((chapter) => {
    const words = chapterEntries(chapter).flatMap((entry) => {
      if (!progress.missions[entry.slug]?.completed) {
        return []
      }
      return entry.vocab
        .filter(([en]) => {
          const key = en.toLowerCase()
          if (seen.has(key)) {
            return false
          }
          seen.add(key)
          return true
        })
        .map(([en, es]) => ({ en, es, mission: entry.title }))
    })
    return { chapter, words }
  }).filter((section) => section.words.length > 0)

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-5">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Volver al mapa"
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink/10 bg-surface shadow-card"
          >
            <ArrowLeft weight="bold" size={20} aria-hidden />
          </Link>
          <h1 className="flex items-center gap-2 font-display text-xl font-bold">
            <BookOpenText
              weight="fill"
              size={22}
              className="text-teal-strong"
              aria-hidden
            />
            Cuaderno
          </h1>
        </div>
        <p className="font-semibold text-muted">
          Tu vocabulario, capítulo a capítulo. Toca una palabra para oírla.
        </p>
      </header>

      {sections.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-ink/15 bg-white/60 p-6 text-center">
          <span className="text-4xl" aria-hidden>
            📖
          </span>
          <p className="font-display font-semibold">
            Todavía no hay palabras aquí
          </p>
          <p className="text-sm font-semibold text-muted">
            Completa tu primera misión y el vocabulario aparecerá en el
            cuaderno.
          </p>
          <Link
            href="/"
            className="flex min-h-12 items-center rounded-2xl bg-accent-strong px-5 font-display font-semibold text-white shadow-pop transition active:translate-y-0.5"
          >
            Ir al mapa
          </Link>
        </section>
      ) : (
        sections.map((section) => (
          <section key={section.chapter} className="flex flex-col gap-3">
            <h2 className="px-1 font-display text-sm font-semibold uppercase tracking-widest text-muted">
              Capítulo {section.chapter} · {CHAPTER_TITLES[section.chapter]}
            </h2>
            <ul className="flex flex-col gap-2">
              {section.words.map((word) => (
                <li key={word.en}>
                  {speechAvailable ? (
                    <button
                      type="button"
                      onClick={() => speak(word.en)}
                      aria-label={`Escuchar ${word.en}`}
                      className="flex w-full items-center gap-3 rounded-2xl border-2 border-ink/10 bg-surface px-4 py-3 text-left shadow-card transition hover:border-teal"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-display text-lg font-semibold text-teal-strong">
                          {word.en}
                        </span>
                        <span className="text-sm font-semibold text-muted">
                          {word.es} · {word.mission}
                        </span>
                      </span>
                      <SpeakerHigh
                        weight="fill"
                        size={20}
                        className="shrink-0 text-teal"
                        aria-hidden
                      />
                    </button>
                  ) : (
                    <span className="flex w-full flex-col rounded-2xl border-2 border-ink/10 bg-surface px-4 py-3 shadow-card">
                      <span className="font-display text-lg font-semibold text-teal-strong">
                        {word.en}
                      </span>
                      <span className="text-sm font-semibold text-muted">
                        {word.es} · {word.mission}
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  )
}
