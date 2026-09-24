"use client"

import {
  ArrowCounterClockwiseIcon,
  ChartBarIcon,
  FireIcon,
  NumberCircleOneIcon,
  NumberCircleThreeIcon,
  NumberCircleTwoIcon,
  ShieldCheckIcon,
  TrophyIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { PageHeader } from "@/shared/components/page-header"
import { useProgress } from "@/shared/hooks/use-progress"
import { COURSE_BANDS, COURSE_BAND_ORDER } from "@/shared/lib/curriculum/course-bands"
import { courseEntries } from "@/shared/lib/curriculum/mission-catalog"
import type { CourseBand } from "@/shared/lib/game/types/mission"
import { STREAK_FREEZE_MAX } from "@/shared/lib/progress/streak"
import type { Progress, ReviewBox } from "@/shared/lib/progress/types"
import { buildReviewPool } from "@/shared/lib/review/review-queue"

const BOXES: {
  box: ReviewBox
  icon: typeof NumberCircleOneIcon
}[] = [
  { box: 1, icon: NumberCircleOneIcon },
  { box: 2, icon: NumberCircleTwoIcon },
  { box: 3, icon: NumberCircleThreeIcon },
]

function reviewSummary(progress: Progress, now: number) {
  const boxes: Record<ReviewBox, number> = { 1: 0, 2: 0, 3: 0 }
  let dueToday = 0

  for (const word of buildReviewPool(progress)) {
    const card = progress.reviews[word.key]
    const box = card?.box ?? 1
    boxes[box] += 1
    if ((card?.dueAt ?? now) <= now) {
      dueToday += 1
    }
  }

  return { boxes, dueToday }
}

function bandOrder(selected: CourseBand | null): CourseBand[] {
  if (!selected) {
    return COURSE_BAND_ORDER
  }
  return [selected, ...COURSE_BAND_ORDER.filter((band) => band !== selected)]
}

function dayLabel(count: number): string {
  return count === 1 ? "1 día" : `${count} días`
}

export function ProgressPanel() {
  const { progress } = useProgress()
  const [now] = useState(() => Date.now())
  const summary = useMemo(() => reviewSummary(progress, now), [progress, now])
  const bands = bandOrder(progress.courseBand)
  const streakAlive = progress.streak.current > 0

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        icon={ChartBarIcon}
        title="Progreso"
        description="Tu racha, las palabras del repaso y las misiones de cada ruta."
      />

      <section className="ui-card overflow-hidden" aria-labelledby="streak-heading">
        <h2 id="streak-heading" className="sr-only">
          Racha
        </h2>
        <div className="flex items-center gap-4 bg-error-soft/70 px-5 py-6">
          <span
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-card ${
              streakAlive ? "bg-error text-white" : "bg-white text-ink/30"
            }`}
          >
            <FireIcon weight="fill" size={32} aria-hidden />
          </span>
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted">
              Racha actual
            </p>
            <p className="font-display text-5xl leading-none font-bold">
              {progress.streak.current}
            </p>
            <p className="font-semibold text-muted">
              {progress.streak.current === 1 ? "día" : "días"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x-2 divide-ink/10 border-t-2 border-ink/10">
          <div className="flex items-center gap-3 px-4 py-4">
            <TrophyIcon
              weight="fill"
              size={22}
              className="shrink-0 text-accent-strong"
              aria-hidden
            />
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted">
                Récord
              </p>
              <p className="font-display text-lg font-bold">
                {dayLabel(progress.streak.best)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-4">
            <ShieldCheckIcon
              weight="fill"
              size={22}
              className={`shrink-0 ${
                progress.streak.freezes > 0 ? "text-teal" : "text-ink/30"
              }`}
              aria-hidden
            />
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted">
                Protectores
              </p>
              <p className="font-display text-lg font-bold">
                {`${progress.streak.freezes} de ${STREAK_FREEZE_MAX}`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="ui-card flex flex-col gap-4 p-5" aria-labelledby="review-heading">
        <h2 id="review-heading" className="flex items-center gap-2 font-display text-lg font-bold">
          <ArrowCounterClockwiseIcon weight="fill" size={22} className="text-accent-strong" aria-hidden />
          Repaso
        </h2>
        <ul className="grid grid-cols-3 gap-3">
          {BOXES.map(({ box, icon: BoxIcon }) => (
            <li
              key={box}
              className="flex flex-col items-center gap-1 rounded-2xl border-2 border-ink/10 bg-paper px-2 py-4 text-center"
            >
              <BoxIcon weight="fill" size={22} className="text-accent-strong" aria-hidden />
              <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted">
                {`Caja ${box}`}
              </p>
              <p className="font-display text-3xl leading-none font-bold">{summary.boxes[box]}</p>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-teal-soft px-4 py-3">
          <p className="font-semibold text-teal-strong">Pendientes hoy</p>
          <p className="font-display text-2xl font-bold text-teal-strong">{summary.dueToday}</p>
        </div>
        {summary.dueToday > 0 && (
          <Link href="/review" className="ui-button ui-button-primary w-full">
            <ArrowCounterClockwiseIcon weight="bold" size={18} aria-hidden />
            Repasar
          </Link>
        )}
      </section>

      <section className="ui-card flex flex-col gap-4 p-5" aria-labelledby="missions-heading">
        <h2 id="missions-heading" className="flex items-center gap-2 font-display text-lg font-bold">
          <ChartBarIcon weight="fill" size={22} className="text-accent-strong" aria-hidden />
          Misiones
        </h2>
        <ul className="flex flex-col gap-4">
          {bands.map((band) => {
            const entries = courseEntries(band)
            const completed = entries.filter(
              (entry) => progress.missions[entry.slug]?.completed,
            ).length
            const info = COURSE_BANDS[band]
            const chosen = band === progress.courseBand
            const percent = entries.length === 0 ? 0 : (completed / entries.length) * 100
            return (
              <li key={band} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-xl" aria-hidden>
                      {info.emoji}
                    </span>
                    <h3 className="truncate font-display font-semibold">
                      {info.title}
                      {chosen ? " · Tu ruta" : ""}
                    </h3>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-muted">
                    {`${info.range} · ${completed} de ${entries.length}`}
                  </p>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-ink/10"
                  role="progressbar"
                  aria-valuenow={completed}
                  aria-valuemin={0}
                  aria-valuemax={entries.length}
                  aria-label={`${info.title}: ${completed} de ${entries.length}`}
                >
                  <div
                    className={`h-full rounded-full ${chosen ? "bg-accent-strong" : "bg-teal"}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
