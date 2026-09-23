"use client"

import {
  ArrowCounterClockwiseIcon,
  BookOpenTextIcon,
  SpeakerHighIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useState, useSyncExternalStore } from "react"
import { useDueReviews } from "@/shared/hooks/use-due-reviews"
import { PageHeader } from "@/shared/components/page-header"
import { useProgress } from "@/shared/hooks/use-progress"
import {
  getSpeechSupportServerSnapshot,
  getSpeechSupportSnapshot,
  speak,
  subscribeSpeechSupport,
} from "@/shared/lib/speech"
import { CHAPTER_TITLES, chapterEntries } from "@/shared/lib/curriculum/mission-catalog"
import type { Chapter } from "@/shared/lib/game/types/mission"
import type { ReviewBox } from "@/shared/lib/progress/types"
import {
  buildReviewPool,
  reviewKey,
  type ReviewWord,
} from "@/shared/lib/review/review-queue"
import { NotebookPractice } from "./notebook-practice"

const CHAPTERS: Chapter[] = [1, 2, 3]

type PracticeWord = ReviewWord & { box: ReviewBox }

export function Notebook() {
  const { progress } = useProgress()
  const dueCount = useDueReviews()
  const speechAvailable = useSyncExternalStore(
    subscribeSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  )
  const [practice, setPractice] = useState<PracticeWord | null>(null)
  const pool = buildReviewPool(progress)

  const seen = new Set<string>()
  const sections = CHAPTERS.map((chapter) => {
    const words = chapterEntries(chapter).flatMap((entry) => {
      if (!progress.missions[entry.slug]?.completed) {
        return []
      }
      return entry.vocab
        .filter(([en]) => {
          const key = reviewKey(en)
          if (seen.has(key)) {
            return false
          }
          seen.add(key)
          return true
        })
        .map(([en, es]) => {
          const key = reviewKey(en)
          return {
            key,
            en,
            es,
            mission: entry.title,
            box: (progress.reviews[key]?.box ?? 1) as ReviewBox,
          }
        })
    })
    return { chapter, words }
  }).filter((section) => section.words.length > 0)

  function startPractice(key: string, box: ReviewBox) {
    const found = pool.find((candidate) => candidate.key === key)
    if (!found) {
      return
    }
    setPractice({ ...found, box })
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        icon={BookOpenTextIcon}
        title="Cuaderno"
        description="Tu vocabulario, capítulo a capítulo. Toca una palabra para oírla."
      >
        {dueCount > 0 && (
          <Link
            href="/review"
            className="ui-button ui-button-subtle justify-between px-5"
          >
            <span className="flex items-center gap-2.5">
              <ArrowCounterClockwiseIcon weight="bold" size={20} aria-hidden />
              Repasar
            </span>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-sm font-bold text-ink">
              {dueCount}
            </span>
          </Link>
        )}
      </PageHeader>

      {practice ? (
        <NotebookPractice
          word={practice}
          pool={pool}
          onExit={() => setPractice(null)}
        />
      ) : sections.length === 0 ? (
        <section className="ui-card-empty flex flex-col items-center gap-4 p-6 text-center">
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
            className="ui-button ui-button-primary-large"
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
                <li
                  key={word.en}
                  className="ui-card-compact flex w-full items-center gap-3 px-4 py-3"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span lang="en" className="font-display text-lg font-semibold text-teal-strong">
                      {word.en}
                    </span>
                    <span className="text-sm font-semibold text-muted">
                      {word.es} · {word.mission}
                    </span>
                    <span
                      role="img"
                      aria-label={`Dominio: caja ${word.box} de 3`}
                      className="flex items-center gap-1"
                    >
                      {[1, 2, 3].map((dot) => (
                        <span
                          key={dot}
                          data-filled={dot <= word.box ? "true" : "false"}
                          className={`size-2 rounded-full ${
                            dot <= word.box ? "bg-teal" : "bg-ink/15"
                          }`}
                        />
                      ))}
                    </span>
                  </span>
                  {speechAvailable && (
                    <button
                      type="button"
                      onClick={() => speak(word.en)}
                      aria-label={`Escuchar ${word.en}`}
                      className="ui-icon-button ui-icon-button-quiet"
                    >
                      <SpeakerHighIcon weight="fill" size={20} aria-hidden />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startPractice(word.key, word.box)}
                    aria-label={`Practicar ${word.en}`}
                    className="ui-button ui-button-subtle shrink-0"
                  >
                    Practicar
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  )
}
