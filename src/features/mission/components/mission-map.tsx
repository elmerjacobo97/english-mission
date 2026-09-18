"use client"

import {
  ArrowCounterClockwise,
  BookOpenText,
  CheckCircle,
  Coins,
  Lock,
  MapTrifold,
  Play,
  Star,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useState } from "react"
import { useDueReviews } from "@/features/review/hooks/use-due-reviews"
import { useProgress } from "@/lib/progress/use-progress"
import {
  CHAPTER_TITLES,
  chapterEntries,
  isUnlocked,
  nextMissionSlug,
} from "../content/mission-catalog"
import type { Chapter, MissionPlanEntry } from "../types/mission"
import { MissionStamp } from "./mission-stamp"

const CHAPTERS: Chapter[] = [1, 2, 3]

export function MissionMap() {
  const { progress, reset } = useProgress()
  const dueCount = useDueReviews()
  const [confirmingReset, setConfirmingReset] = useState(false)

  const continueSlug = nextMissionSlug(progress)
  const continueEntry = chapterEntries(1)
    .concat(chapterEntries(2), chapterEntries(3))
    .find((entry) => entry.slug === continueSlug)

  const hasProgress =
    Object.keys(progress.missions).length > 0 || progress.coins > 0
  const hasNotebook = Object.values(progress.missions).some(
    (mission) => mission.completed,
  )

  function renderEntry(entry: MissionPlanEntry) {
    const unlocked = isUnlocked(entry, progress)
    const missionProgress = progress.missions[entry.slug]
    const completed = missionProgress?.completed === true
    const stars = missionProgress?.stars ?? 0

    if (!entry.written) {
      return (
        <li key={entry.slug} className="relative flex items-start gap-3">
          <span className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-ink/20 bg-white/70 text-muted">
            <Lock weight="fill" size={16} aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-3xl border-2 border-dashed border-ink/15 bg-white/40 p-4 text-muted">
            <span className="text-2xl" aria-hidden>
              {entry.emoji}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-display text-xs font-semibold uppercase tracking-widest">
                Próximamente
              </span>
              <span className="font-display text-lg leading-tight font-bold">
                {entry.title}
              </span>
              <span className="text-sm font-semibold">{entry.subtitle}</span>
            </span>
          </div>
        </li>
      )
    }

    if (!unlocked) {
      return (
        <li key={entry.slug} className="relative flex items-start gap-3">
          <span className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink/15 bg-surface font-display font-bold text-muted shadow-card">
            <Lock weight="fill" size={18} aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-3xl border-2 border-dashed border-ink/15 bg-white/60 p-4 opacity-80">
            <span className="font-display text-xs font-semibold uppercase tracking-widest text-muted">
              Misión {entry.order} · Nivel {entry.level}
            </span>
            <span className="font-display text-lg leading-tight font-bold text-muted">
              {entry.title}
            </span>
            <span className="text-sm font-semibold text-muted">
              Completa la misión anterior para desbloquearla
            </span>
          </div>
        </li>
      )
    }

    return (
      <li key={entry.slug} className="relative flex items-start gap-3">
        <span
          className={`z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-display font-bold shadow-card ${
            completed
              ? "border-teal/40 bg-teal-soft text-teal-strong"
              : "border-accent-deep/30 bg-accent text-ink"
          }`}
        >
          {completed ? (
            <CheckCircle weight="fill" size={24} aria-hidden />
          ) : (
            entry.order
          )}
        </span>
        <Link
          href={`/mision/${entry.slug}`}
          className="flex min-w-0 flex-1 flex-col gap-3 rounded-3xl border-2 border-ink/10 bg-surface p-4 shadow-card transition hover:-translate-y-0.5"
        >
          <span className="flex items-start gap-3">
            <span className="text-3xl" aria-hidden>
              {entry.emoji}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-display text-xs font-semibold uppercase tracking-widest text-muted">
                Misión {entry.order} · Nivel {entry.level}
              </span>
              <span className="font-display text-lg leading-tight font-bold">
                {entry.title}
              </span>
              <span className="text-sm font-semibold text-muted">
                {entry.subtitle}
              </span>
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-accent-strong px-4 py-2 font-display text-sm font-semibold text-white shadow-pop">
              {completed ? (
                <ArrowCounterClockwise weight="bold" size={18} aria-hidden />
              ) : (
                <Play weight="fill" size={18} aria-hidden />
              )}
              {completed ? "Repetir" : "Jugar"}
            </span>
            {completed && (
              <span
                className="flex items-center gap-0.5"
                role="img"
                aria-label={`${stars} de 3 estrellas`}
              >
                {[1, 2, 3].map((position) => (
                  <Star
                    key={position}
                    weight={position <= stars ? "fill" : "regular"}
                    size={18}
                    className={
                      position <= stars ? "text-accent" : "text-ink/20"
                    }
                    aria-hidden
                  />
                ))}
              </span>
            )}
            {completed && <MissionStamp />}
          </span>
        </Link>
      </li>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <MapTrifold
              weight="fill"
              size={28}
              className="text-accent-strong"
              aria-hidden
            />
            English Mission
          </h1>
          <span
            key={progress.coins}
            className="animate-pop flex items-center gap-1.5 rounded-full border-2 border-ink/10 bg-surface px-3 py-2 font-display text-sm font-semibold shadow-card"
          >
            <Coins
              weight="duotone"
              size={18}
              className="text-accent-strong"
              aria-hidden
            />
            {progress.coins}
          </span>
        </div>
        <p className="font-semibold text-muted">
          Una historia en 12 misiones: de tu primer día a sentirte en casa.
        </p>
      </header>

      {continueEntry && (
        <Link
          href={`/mision/${continueEntry.slug}`}
          className="flex min-h-14 items-center justify-between gap-3 rounded-3xl border-2 border-accent-deep/20 bg-accent px-5 font-display font-bold text-ink shadow-card transition hover:-translate-y-0.5"
        >
          <span className="flex items-center gap-2.5">
            <Play weight="fill" size={22} aria-hidden />
            Continuar
          </span>
          <span className="truncate text-sm font-semibold">
            {continueEntry.emoji} {continueEntry.title}
          </span>
        </Link>
      )}

      {hasNotebook && (
        <Link
          href="/cuaderno"
          className="flex min-h-12 items-center gap-2.5 rounded-3xl border-2 border-teal/25 bg-teal-soft px-5 font-display font-semibold text-teal-strong shadow-card transition hover:-translate-y-0.5"
        >
          <BookOpenText weight="fill" size={20} aria-hidden />
          Cuaderno de vocabulario
        </Link>
      )}

      {dueCount > 0 && (
        <Link
          href="/review"
          className="flex min-h-12 items-center gap-2.5 rounded-3xl border-2 border-accent/30 bg-paper px-5 font-display font-semibold text-accent-deep shadow-card transition hover:-translate-y-0.5"
        >
          <ArrowCounterClockwise weight="bold" size={20} aria-hidden />
          Repasar vocabulario
          <span className="ml-auto rounded-full bg-accent px-2.5 py-0.5 text-sm font-bold text-ink">
            {dueCount}
          </span>
        </Link>
      )}

      {CHAPTERS.map((chapter) => {
        const entries = chapterEntries(chapter)
        const completedCount = entries.filter(
          (entry) => progress.missions[entry.slug]?.completed,
        ).length
        return (
          <section key={chapter} className="flex flex-col gap-3">
            <header className="flex items-baseline justify-between gap-2 px-1">
              <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted">
                Capítulo {chapter} · {CHAPTER_TITLES[chapter]}
              </h2>
              <span className="font-display text-xs font-semibold text-muted">
                {completedCount}/{entries.length}
              </span>
            </header>
            <div className="relative">
              <div
                aria-hidden
                className="absolute top-10 bottom-10 left-[21px] border-l-2 border-dashed border-ink/15"
              />
              <ol className="relative flex flex-col gap-3">
                {entries.map((entry) => renderEntry(entry))}
              </ol>
            </div>
          </section>
        )
      })}

      {hasProgress && (
        <footer className="flex flex-col gap-3">
          {confirmingReset ? (
            <div className="animate-slide-in flex flex-col gap-3 rounded-3xl border-2 border-error/20 bg-error-soft p-5">
              <p className="font-display font-semibold text-error">
                Esto borra tus monedas, estrellas y misiones completadas.
                ¿Seguro?
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    reset()
                    setConfirmingReset(false)
                  }}
                  className="min-h-11 rounded-2xl bg-error px-4 font-display font-semibold text-white"
                >
                  Sí, borrar todo
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className="min-h-11 rounded-2xl border-2 border-ink/10 bg-surface px-4 font-display font-semibold shadow-card"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="flex min-h-11 items-center gap-2 self-start rounded-2xl border-2 border-ink/10 bg-surface px-4 font-display text-sm font-semibold text-muted shadow-card transition hover:text-ink"
            >
              <ArrowCounterClockwise weight="bold" size={18} aria-hidden />
              Reiniciar progreso
            </button>
          )}
        </footer>
      )}
    </main>
  )
}
