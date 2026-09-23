"use client"

import { MapTrifoldIcon } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { CourseBandSelector } from "./course-band-selector"
import { PlacementQuiz } from "./placement-quiz"
import { useProgress } from "@/shared/hooks/use-progress"
import type { CourseBand } from "@/shared/lib/game/types/mission"
import {
  flush,
  getSyncSnapshot,
  retry,
} from "@/shared/lib/progress/progress-sync"

export function CourseBandOnboarding() {
  const router = useRouter()
  const { setCourseBand } = useProgress()
  const [quizOpen, setQuizOpen] = useState(true)
  const [pending, setPending] = useState(false)
  const [saveError, setSaveError] = useState(false)

  async function continueToMap() {
    await flush()

    if (getSyncSnapshot().state === "error") {
      setSaveError(true)
      setPending(false)
      return
    }

    router.replace("/")
  }

  async function selectBand(band: CourseBand) {
    if (pending) {
      return
    }

    setPending(true)
    setSaveError(false)
    setCourseBand(band)
    await continueToMap()
  }

  async function retrySelection() {
    if (pending) {
      return
    }

    setPending(true)
    setSaveError(false)
    await retry()

    if (getSyncSnapshot().state === "error") {
      setSaveError(true)
      setPending(false)
      return
    }

    router.replace("/")
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex items-center gap-2 font-display text-lg font-bold">
        <MapTrifoldIcon weight="fill" size={24} className="text-accent-strong" aria-hidden />
        English Mission
      </header>

      <section className="flex flex-col gap-3 rounded-3xl border-2 border-ink/10 bg-surface p-5 shadow-card sm:p-6">
        <p className="font-display text-xs font-bold uppercase tracking-widest text-accent-strong">
          Antes de empezar
        </p>
        <h1 className="font-display text-2xl font-bold">
          Descubramos tu ruta de inglés
        </h1>
        <p className="font-medium leading-6 text-muted">
          Responde unas preguntas para recomendarte un punto de partida. Puedes
          cambiar de ruta después desde Configuración.
        </p>
        {quizOpen && (
          <button
            type="button"
            onClick={() => setQuizOpen(false)}
            disabled={pending}
            className="self-start font-display text-sm font-bold text-teal-strong underline decoration-2 underline-offset-4 disabled:opacity-50"
          >
            Elegir nivel manualmente
          </button>
        )}
      </section>

      {quizOpen ? (
        <PlacementQuiz
          onClose={() => setQuizOpen(false)}
          onSelect={selectBand}
        />
      ) : (
        <CourseBandSelector
          selectedBand={null}
          onSelect={selectBand}
          onOpenPlacement={() => setQuizOpen(true)}
        />
      )}

      {pending && (
        <p className="rounded-2xl bg-teal-soft px-4 py-3 text-sm font-semibold text-teal-strong" role="status">
          Guardando tu ruta...
        </p>
      )}

      {saveError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-error/20 bg-error/5 px-4 py-3 text-sm font-semibold text-error" role="alert">
          <span>No pudimos guardar tu ruta.</span>
          <button
            type="button"
            onClick={retrySelection}
            className="min-h-10 rounded-xl bg-error px-3 font-display text-white"
          >
            Reintentar
          </button>
        </div>
      )}
    </main>
  )
}
