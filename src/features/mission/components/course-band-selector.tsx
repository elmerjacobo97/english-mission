"use client"

import { COURSE_BAND_ORDER, COURSE_BANDS } from "@/shared/lib/curriculum/course-bands"
import type { CourseBand } from "@/shared/lib/game/types/mission"

type CourseBandSelectorProps = {
  selectedBand: CourseBand | null
  onSelect: (band: CourseBand) => void
  onOpenPlacement: () => void
}

export function CourseBandSelector({
  selectedBand,
  onSelect,
  onOpenPlacement,
}: CourseBandSelectorProps) {
  const isFirstRun = selectedBand === null

  return (
    <section
      aria-labelledby="course-band-title"
      className="flex flex-col gap-3 rounded-3xl border-2 border-ink/10 bg-surface p-4 shadow-card sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="course-band-title" className="font-display text-lg font-bold">
            {isFirstRun ? "¿Por dónde quieres empezar?" : "Tu nivel de inglés"}
          </h2>
          <p className="mt-1 max-w-xl text-sm font-medium text-muted">
            Elige una ruta o cambia de nivel cuando quieras. Practica diciendo las frases en voz alta; no necesitas micrófono.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPlacement}
          className="min-h-11 shrink-0 rounded-2xl border-2 border-accent-deep/15 bg-accent px-4 font-display text-sm font-bold text-ink transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
        >
          Hacer diagnóstico
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Elige tu nivel de inglés">
        {COURSE_BAND_ORDER.map((band) => {
          const info = COURSE_BANDS[band]
          const active = selectedBand === band
          return (
            <button
              key={band}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(band)}
              className={`flex min-h-20 items-start gap-3 rounded-2xl border-2 p-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong ${
                active
                  ? "border-accent-strong bg-accent/60 shadow-pop"
                  : "border-ink/10 bg-paper hover:border-accent-deep/30"
              }`}
            >
              <span className="mt-0.5 text-2xl" aria-hidden>
                {info.emoji}
              </span>
              <span className="flex flex-col">
                <span className="font-display font-bold">
                  {info.title} <span className="text-muted">{info.range}</span>
                </span>
                <span className="mt-1 text-xs font-medium leading-5 text-muted">
                  {info.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
