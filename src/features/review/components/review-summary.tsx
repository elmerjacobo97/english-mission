"use client"

import Link from "next/link"
import { CharacterAvatar } from "@/features/mission/components/character-avatar"
import type { ReviewStats } from "../hooks/use-review-run"

type ReviewSummaryProps = {
  stats: ReviewStats
  hasMore: boolean
  onRestart: () => void
}

export function ReviewSummary({
  stats,
  hasMore,
  onRestart,
}: ReviewSummaryProps) {
  return (
    <section className="flex flex-col gap-5 rounded-3xl border-2 border-ink/10 bg-surface p-6 shadow-card">
      <div className="flex items-start gap-3">
        <CharacterAvatar character="coco" size={44} className="shrink-0" />
        <p className="rounded-2xl bg-paper px-4 py-3 font-semibold">
          ¡Buen trabajo! Repasamos {stats.reviewed}{" "}
          {stats.reviewed === 1 ? "palabra" : "palabras"} juntas.
          {stats.repeated > 0 &&
            " Las que fallamos vuelven mañana a la caja 1."}
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col gap-1 rounded-2xl border-2 border-ink/10 bg-paper px-2 py-3">
          <dt className="text-xs font-semibold uppercase tracking-widest text-muted">
            Repasadas
          </dt>
          <dd className="font-display text-xl font-bold">{stats.reviewed}</dd>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border-2 border-success/20 bg-success-soft px-2 py-3">
          <dt className="text-xs font-semibold uppercase tracking-widest text-success">
            Subieron
          </dt>
          <dd className="font-display text-xl font-bold text-success">
            {stats.promoted}
          </dd>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border-2 border-error/20 bg-error-soft px-2 py-3">
          <dt className="text-xs font-semibold uppercase tracking-widest text-error">
            Repitieron
          </dt>
          <dd className="font-display text-xl font-bold text-error">
            {stats.repeated}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        {hasMore && (
          <button
            type="button"
            onClick={onRestart}
            className="flex min-h-12 items-center justify-center rounded-2xl bg-accent-strong px-5 font-display font-semibold text-white shadow-pop transition active:translate-y-0.5"
          >
            Repasar más
          </button>
        )}
        <Link
          href="/cuaderno"
          className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-ink/10 bg-surface px-5 font-display font-semibold text-muted shadow-card transition hover:text-ink"
        >
          Volver al cuaderno
        </Link>
      </div>
    </section>
  )
}
