"use client"

import { ArrowCounterClockwiseIcon, ArrowRightIcon } from "@phosphor-icons/react"
import Link from "next/link"
import { useEffect, useRef, useSyncExternalStore } from "react"
import { ChoiceChallenge } from "@/shared/components/game/choice-challenge"
import { ListenChallenge } from "@/shared/components/game/listen-challenge"
import { TypeChallenge } from "@/shared/components/game/type-challenge"
import { PageHeader } from "@/shared/components/page-header"
import {
  getSpeechSupportServerSnapshot,
  getSpeechSupportSnapshot,
  subscribeSpeechSupport,
} from "@/shared/lib/speech"
import { useReviewRun } from "../hooks/use-review-run"
import { ReviewSummary } from "./review-summary"

export function ReviewSession() {
  const speechAvailable = useSyncExternalStore(
    subscribeSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  )
  const run = useReviewRun(speechAvailable)
  const stepRef = useRef<HTMLDivElement>(null)
  const previousIndex = useRef(run.index)

  useEffect(() => {
    if (previousIndex.current !== run.index) {
      stepRef.current?.focus()
      previousIndex.current = run.index
    }
  }, [run.index])

  if (run.total === 0) {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <PageHeader
          icon={ArrowCounterClockwiseIcon}
          title="Repaso"
          description="Palabras que ya viste, justo cuando toca repasarlas."
        />
        <section className="ui-card-empty flex flex-col items-center gap-4 p-6 text-center">
          <span className="text-4xl" aria-hidden>
            🎉
          </span>
          <p className="font-display font-semibold">Todo al día</p>
          <p className="text-sm font-semibold text-muted">
            No hay palabras vencidas. Vuelve cuando toque el próximo repaso.
          </p>
          <Link
            href="/notebook"
            className="ui-button ui-button-primary-large"
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
          icon={ArrowCounterClockwiseIcon}
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
          <div
            key={run.index}
            ref={stepRef}
            role="group"
            aria-label={`Palabra ${run.index + 1} de ${run.total}`}
            tabIndex={-1}
            className="animate-rise"
          >
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
                className="ui-button ui-button-primary animate-pop justify-self-end"
              >
                {run.index + 1 === run.total ? "Ver resumen" : "Continuar"}
                <ArrowRightIcon weight="bold" size={16} aria-hidden />
              </button>
            ) : canSubmit ? (
              <button
                type="submit"
                form="challenge-form"
                className="ui-button ui-button-primary justify-self-end"
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
