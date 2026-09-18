"use client"

import { ArrowCounterClockwise, ArrowRight } from "@phosphor-icons/react"
import Link from "next/link"
import { useSyncExternalStore } from "react"
import { ChoiceChallenge } from "@/components/game/choice-challenge"
import { ListenChallenge } from "@/components/game/listen-challenge"
import { TypeChallenge } from "@/components/game/type-challenge"
import { PageHeader } from "@/components/page-header"
import {
  getSpeechSupportServerSnapshot,
  getSpeechSupportSnapshot,
  subscribeSpeechSupport,
} from "@/lib/speech"
import { useReviewRun } from "../hooks/use-review-run"
import { ReviewSummary } from "./review-summary"

export function ReviewSession() {
  const speechAvailable = useSyncExternalStore(
    subscribeSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  )
  const run = useReviewRun(speechAvailable)

  if (run.total === 0) {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <PageHeader
          icon={ArrowCounterClockwise}
          title="Repaso"
          description="Palabras que ya viste, justo cuando toca repasarlas."
        />
        <section className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-ink/15 bg-white/60 p-6 text-center">
          <span className="text-4xl" aria-hidden>
            🎉
          </span>
          <p className="font-display font-semibold">Todo al día</p>
          <p className="text-sm font-semibold text-muted">
            No hay palabras vencidas. Vuelve cuando toque el próximo repaso.
          </p>
          <Link
            href="/notebook"
            className="flex min-h-12 items-center rounded-2xl bg-accent-strong px-5 font-display font-semibold text-white shadow-pop transition active:translate-y-0.5"
          >
            Ir al cuaderno
          </Link>
        </section>
      </main>
    )
  }

  if (run.phase === "complete") {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <PageHeader
          icon={ArrowCounterClockwise}
          title="Repaso"
          description="Palabras que ya viste, justo cuando toca repasarlas."
        />
        <ReviewSummary
          stats={run.stats}
          hasMore={run.hasMore}
          onRestart={run.restart}
        />
      </main>
    )
  }

  const beat = run.challenge
  const solved = run.solved
  const canSubmit = !solved && beat?.kind === "type"
  const progressPercent = Math.round(((run.index + 1) / run.total) * 100)
  const shared = {
    coins: 0,
    rewardsEnabled: false,
    freeHints: true,
    profile: run.profile,
    onSpendCoins: () => false,
    onSolved: run.answer,
    onContinue: run.goNext,
  }

  return (
    <main className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <p className="font-display text-sm font-semibold text-muted">Repaso</p>
        <span className="rounded-full border-2 border-ink/10 bg-surface px-3 py-2 font-display text-sm font-semibold shadow-card">
          {run.index + 1} de {run.total}
        </span>
      </header>

      <div
        role="progressbar"
        aria-label="Progreso del repaso"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 w-full overflow-hidden rounded-full border-2 border-ink/10 bg-surface"
      >
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {beat ? (
        <>
          <div key={run.index} className="animate-rise">
            {beat.kind === "choice" && (
              <ChoiceChallenge beat={beat} {...shared} />
            )}
            {beat.kind === "type" && <TypeChallenge beat={beat} {...shared} />}
            {beat.kind === "listen" && (
              <ListenChallenge
                beat={beat}
                speechAvailable={speechAvailable}
                {...shared}
              />
            )}
          </div>

          <div className="grid grid-cols-3 items-center gap-2">
            <span />
            <span className="justify-self-center font-display text-xs font-semibold text-muted">
              Palabra {run.index + 1} de {run.total}
            </span>
            {solved ? (
              <button
                type="button"
                onClick={run.goNext}
                className="animate-pop flex min-h-11 items-center gap-1.5 justify-self-end rounded-2xl bg-accent-strong px-4 font-display text-sm font-semibold text-white shadow-pop transition active:translate-y-0.5"
              >
                {run.index + 1 === run.total ? "Ver resumen" : "Continuar"}
                <ArrowRight weight="bold" size={16} aria-hidden />
              </button>
            ) : canSubmit ? (
              <button
                type="submit"
                form="challenge-form"
                className="flex min-h-11 items-center gap-1.5 justify-self-end rounded-2xl bg-accent-strong px-4 font-display text-sm font-semibold text-white shadow-pop transition active:translate-y-0.5"
              >
                Comprobar
              </button>
            ) : (
              <span />
            )}
          </div>
        </>
      ) : null}
    </main>
  )
}
