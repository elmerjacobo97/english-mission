"use client"

import {
  ArrowCounterClockwise,
  CheckCircle,
  Fire,
  Lock,
  MapTrifold,
  Play,
  Star,
  X,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useState } from "react"
import { PageHeader } from "@/components/page-header"
import { STREAK_MILESTONES } from "@/lib/progress/streak"
import { useProgress } from "@/lib/progress/use-progress"
import {
  CHAPTER_TITLES,
  chapterEntries,
  isUnlocked,
  nextMissionSlug,
} from "@/lib/curriculum/mission-catalog"
import type { Chapter, MissionPlanEntry } from "@/lib/game/types/mission"
import { MissionStamp } from "./mission-stamp"

const CHAPTERS: Chapter[] = [1, 2, 3]

export function MissionMap() {
  const { progress, clearPendingMilestone, reset } = useProgress()
  const [confirmingReset, setConfirmingReset] = useState(false)

  const { streak } = progress
  const { pendingMilestone } = streak

  const continueSlug = nextMissionSlug(progress)

  const hasProgress =
    Object.keys(progress.missions).length > 0 || progress.coins > 0

  function renderEntry(entry: MissionPlanEntry) {
    const unlocked = isUnlocked(entry, progress)
    const missionProgress = progress.missions[entry.slug]
    const completed = missionProgress?.completed === true
    const stars = missionProgress?.stars ?? 0
    const isNext = entry.slug === continueSlug

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
          className={`flex min-w-0 flex-1 flex-col gap-3 rounded-3xl border-2 bg-surface p-4 transition hover:-translate-y-0.5 ${
            isNext ? "border-accent shadow-pop" : "border-ink/10 shadow-card"
          }`}
        >
          <span className="flex items-start gap-3">
            <span className="text-3xl" aria-hidden>
              {entry.emoji}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-widest text-muted">
                Misión {entry.order} · Nivel {entry.level}
                {isNext && !completed && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold tracking-normal text-ink normal-case">
                    Siguiente
                  </span>
                )}
              </span>
              <span className="font-display text-lg leading-tight font-bold">
                {entry.title}
              </span>
              <span className="text-sm font-semibold text-muted">
                {entry.subtitle}
              </span>
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-2">
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
            {completed && <MissionStamp className="ml-auto" />}
          </span>
        </Link>
      </li>
    )
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        icon={MapTrifold}
        title="Misiones"
        description="Una historia en 12 misiones: de tu primer día a sentirte en casa."
        aside={
          hasProgress && (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              aria-label="Reiniciar progreso"
              title="Reiniciar progreso"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-ink/10 bg-surface text-muted shadow-card transition hover:text-error"
            >
              <ArrowCounterClockwise weight="bold" size={18} aria-hidden />
            </button>
          )
        }
      />

      {pendingMilestone !== null && (
        <div className="animate-slide-in flex items-center gap-3 rounded-3xl border-2 border-accent-deep/20 bg-accent px-5 py-4 shadow-card">
          <Fire
            weight="fill"
            size={22}
            className="shrink-0 text-error"
            aria-hidden
          />
          <p className="flex-1 font-display font-semibold text-ink">
            ¡Racha de {pendingMilestone} días! +{STREAK_MILESTONES[pendingMilestone]}{" "}
            monedas
          </p>
          <button
            type="button"
            onClick={clearPendingMilestone}
            aria-label="Cerrar aviso"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink/10 bg-surface text-ink shadow-card transition hover:-translate-y-0.5"
          >
            <X weight="bold" size={16} aria-hidden />
          </button>
        </div>
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

      {confirmingReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setConfirmingReset(false)
            }
          }}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-ink/40"
            onClick={() => setConfirmingReset(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            aria-describedby="reset-body"
            className="animate-pop relative flex w-full max-w-sm flex-col gap-4 rounded-3xl border-2 border-error/20 bg-surface p-5 shadow-card"
          >
            <p id="reset-title" className="font-display text-lg font-bold">
              ¿Reiniciar progreso?
            </p>
            <p id="reset-body" className="text-sm font-semibold text-muted">
              Esto borra tus monedas, estrellas y misiones completadas. No se
              puede deshacer.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmingReset(false)}
                className="min-h-11 rounded-2xl border-2 border-ink/10 bg-surface px-4 font-display font-semibold shadow-card"
              >
                Cancelar
              </button>
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
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
