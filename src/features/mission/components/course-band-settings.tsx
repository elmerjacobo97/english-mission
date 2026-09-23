"use client"

import { GearSixIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { CourseBandSelector } from "./course-band-selector"
import { PlacementQuiz } from "./placement-quiz"
import { useProgress } from "@/shared/hooks/use-progress"
import type { CourseBand } from "@/shared/lib/game/types/mission"

export function CourseBandSettings() {
  const { progress, setCourseBand } = useProgress()
  const [placementOpen, setPlacementOpen] = useState(false)

  function selectBand(band: CourseBand) {
    setCourseBand(band)
    setPlacementOpen(false)
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
          <GearSixIcon weight="fill" size={24} className="text-accent-strong" aria-hidden />
          Configuración
        </h1>
        <p className="font-semibold text-muted">
          Ajusta tu ruta de aprendizaje cuando quieras.
        </p>
      </header>

      <CourseBandSelector
        selectedBand={progress.courseBand}
        onSelect={selectBand}
        onOpenPlacement={() => setPlacementOpen(true)}
      />

      {placementOpen && (
        <PlacementQuiz
          onClose={() => setPlacementOpen(false)}
          onSelect={selectBand}
          resultActionPrefix="Cambiar a"
        />
      )}

      <p className="rounded-2xl bg-teal-soft px-4 py-3 text-sm font-semibold text-teal-strong">
        Cambiar de ruta no borra tus misiones, monedas ni repasos.
      </p>
    </main>
  )
}
