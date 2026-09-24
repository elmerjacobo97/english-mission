"use client"

import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  FireIcon,
  LockIcon,
  MapTrifoldIcon,
  PlayIcon,
  StarIcon,
  XIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useState } from "react"
import { PageHeader } from "@/shared/components/page-header"
import { STREAK_MILESTONES } from "@/shared/lib/progress/streak"
import { useProgress } from "@/shared/hooks/use-progress"
import { courseEntries, isUnlocked, nextMissionSlug } from "@/shared/lib/curriculum/mission-catalog"
import { COURSE_BANDS } from "@/shared/lib/curriculum/course-bands"
import type { MissionPlanEntry } from "@/shared/lib/game/types/mission"
import { MissionStamp } from "./mission-stamp"

export function MissionMap() {
  const { progress, clearPendingFreezes, clearPendingMilestone, reset } = useProgress()
  const [confirmingReset, setConfirmingReset] = useState(false)

  const { streak } = progress
  const { pendingMilestone, pendingFreezesUsed } = streak
  const freezeNotice =
    pendingFreezesUsed === 1
      ? "Usamos un protector. Tu racha sigue."
      : pendingFreezesUsed === 2
        ? "Usamos 2 protectores. Tu racha sigue."
        : null

  const selectedBand = progress.courseBand
  const continueSlug = selectedBand ? nextMissionSlug(progress, selectedBand) : null

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
            <LockIcon weight="fill" size={16} aria-hidden />
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
            <LockIcon weight="fill" size={18} aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-3xl border-2 border-dashed border-ink/15 bg-white/60 p-4 opacity-80">
            <span className="font-display text-xs font-semibold uppercase tracking-widest text-muted">
              Misión {entry.order} · {entry.cefrLevel} · Reto {entry.level}
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
            <CheckCircleIcon weight="fill" size={24} aria-hidden />
          ) : (
            entry.order
          )}
        </span>
        <Link
          href={`/mission/${entry.slug}`}
          className={`ui-card-interactive flex min-w-0 flex-1 flex-col gap-3 p-4 shadow-card transition hover:-translate-y-0.5 ${
            isNext ? "border-accent shadow-pop" : "border-ink/10 shadow-card"
          }`}
        >
          <span className="flex items-start gap-3">
            <span className="text-3xl" aria-hidden>
              {entry.emoji}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-widest text-muted">
                Misión {entry.order} · {entry.cefrLevel} · Reto {entry.level}
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
            <span className="ui-button ui-button-primary shrink-0">
              {completed ? (
                <ArrowCounterClockwiseIcon weight="bold" size={18} aria-hidden />
              ) : (
                <PlayIcon weight="fill" size={18} aria-hidden />
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
                  <StarIcon
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
        icon={MapTrifoldIcon}
        title="Misiones"
        description="Tres rutas en inglés con historias, práctica guiada y repaso."
        aside={
          hasProgress && (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              aria-label="Reiniciar progreso"
              title="Reiniciar progreso"
              className="ui-icon-button ui-icon-button-danger"
            >
              <ArrowCounterClockwiseIcon weight="bold" size={18} aria-hidden />
            </button>
          )
        }
      />

      {pendingMilestone !== null && (
        <div className="animate-slide-in flex items-center gap-3 rounded-3xl border-2 border-accent-deep/20 bg-accent px-5 py-4 shadow-card">
          <FireIcon
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
              className="ui-icon-button"
          >
            <XIcon weight="bold" size={16} aria-hidden />
          </button>
        </div>
      )}

      {freezeNotice !== null && (
        <div className="animate-slide-in flex items-center gap-3 rounded-3xl border-2 border-accent-deep/20 bg-accent px-5 py-4 shadow-card">
          <FireIcon
            weight="fill"
            size={22}
            className="shrink-0 text-error"
            aria-hidden
          />
          <p className="flex-1 font-display font-semibold text-ink">{freezeNotice}</p>
          <button
            type="button"
            onClick={clearPendingFreezes}
            aria-label="Cerrar aviso de protector"
            className="ui-icon-button"
          >
            <XIcon weight="bold" size={16} aria-hidden />
          </button>
        </div>
      )}

      {selectedBand && (() => {
        const entries = courseEntries(selectedBand)
        const completedCount = entries.filter(
          (entry) => progress.missions[entry.slug]?.completed,
        ).length
        return (
          <section key={selectedBand} className="flex flex-col gap-3">
            <header className="flex items-baseline justify-between gap-2 px-1">
              <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted">
                Ruta {COURSE_BANDS[selectedBand].title} · {COURSE_BANDS[selectedBand].range}
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
      })()}

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
              Esto borra tus monedas, estrellas y misiones completadas. Se
              conservará la ruta elegida. No se puede deshacer.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmingReset(false)}
                className="ui-button ui-button-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  reset()
                  setConfirmingReset(false)
                }}
                className="ui-button ui-button-danger"
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
