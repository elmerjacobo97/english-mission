"use client"

import {
  ArrowCounterClockwise,
  CheckCircle,
  Coins,
  Lock,
  MapTrifold,
  Play,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useState } from "react"
import { useProgress } from "@/lib/progress/use-progress"
import type { Mission } from "../types/mission"
import { MissionStamp } from "./mission-stamp"

type MissionMapProps = {
  missions: Mission[]
}

export function MissionMap({ missions }: MissionMapProps) {
  const { progress, reset } = useProgress()
  const [confirmingReset, setConfirmingReset] = useState(false)

  function isUnlocked(index: number): boolean {
    if (index === 0) {
      return true
    }
    return progress.completed.includes(missions[index - 1].slug)
  }

  const hasProgress = progress.completed.length > 0 || progress.coins > 0

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
          Aprende inglés viviendo una historia. Cada misión, una aventura.
        </p>
      </header>

      <div className="relative">
        <div
          aria-hidden
          className="absolute top-10 bottom-10 left-[21px] border-l-2 border-dashed border-ink/15"
        />
        <ol className="relative flex flex-col gap-3">
          {missions.map((mission, index) => {
            const unlocked = isUnlocked(index)
            const completed = progress.completed.includes(mission.slug)

            return (
              <li key={mission.slug} className="relative flex items-start gap-3">
                <span
                  className={`z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-display font-bold shadow-card ${
                    completed
                      ? "border-teal/40 bg-teal-soft text-teal-strong"
                      : unlocked
                        ? "border-accent-deep/30 bg-accent text-ink"
                        : "border-ink/15 bg-surface text-muted"
                  }`}
                >
                  {completed ? (
                    <CheckCircle weight="fill" size={24} aria-hidden />
                  ) : unlocked ? (
                    index + 1
                  ) : (
                    <Lock weight="fill" size={18} aria-hidden />
                  )}
                </span>

                {unlocked ? (
                  <Link
                    href={`/mision/${mission.slug}`}
                    className="flex min-w-0 flex-1 flex-col gap-3 rounded-3xl border-2 border-ink/10 bg-surface p-4 shadow-card transition hover:-translate-y-0.5"
                  >
                    <span className="flex items-start gap-3">
                      <span className="text-3xl" aria-hidden>
                        {mission.emoji}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-display text-xs font-semibold uppercase tracking-widest text-muted">
                          Misión {index + 1}
                        </span>
                        <span className="font-display text-lg leading-tight font-bold">
                          {mission.title}
                        </span>
                        <span className="text-sm font-semibold text-muted">
                          {mission.subtitle}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-accent-strong px-4 py-2 font-display text-sm font-semibold text-white shadow-pop">
                        {completed ? (
                          <ArrowCounterClockwise
                            weight="bold"
                            size={18}
                            aria-hidden
                          />
                        ) : (
                          <Play weight="fill" size={18} aria-hidden />
                        )}
                        {completed ? "Repetir" : "Jugar"}
                      </span>
                      {completed && <MissionStamp />}
                    </span>
                  </Link>
                ) : (
                  <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-3xl border-2 border-dashed border-ink/15 bg-white/60 p-4 opacity-75">
                    <span className="flex items-start gap-3">
                      <span className="text-3xl grayscale" aria-hidden>
                        {mission.emoji}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-display text-xs font-semibold uppercase tracking-widest text-muted">
                          Misión {index + 1}
                        </span>
                        <span className="font-display text-lg leading-tight font-bold">
                          {mission.title}
                        </span>
                        <span className="text-sm font-semibold text-muted">
                          Completa la misión anterior para desbloquearla
                        </span>
                      </span>
                    </span>
                  </div>
                )}
              </li>
            )
          })}

          <li className="relative flex items-start gap-3">
            <span className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-ink/20 bg-white/70 font-display text-lg font-bold text-muted">
              +
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-3xl border-2 border-dashed border-ink/15 bg-white/40 p-4 text-muted">
              <span className="text-3xl" aria-hidden>
                🏙️
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-display text-xs font-semibold uppercase tracking-widest">
                  Próximamente
                </span>
                <span className="font-display text-lg leading-tight font-bold">
                  Más misiones
                </span>
                <span className="text-sm font-semibold">
                  La ciudad sigue creciendo
                </span>
              </span>
            </div>
          </li>
        </ol>
      </div>

      {hasProgress && (
        <footer className="flex flex-col gap-3">
          {confirmingReset ? (
            <div className="animate-slide-in flex flex-col gap-3 rounded-3xl border-2 border-error/20 bg-error-soft p-5">
              <p className="font-display font-semibold text-error">
                Esto borra tus monedas y misiones completadas. ¿Seguro?
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
