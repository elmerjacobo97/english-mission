"use client"

import { GearSixIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { PageHeader } from "@/shared/components/page-header"
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
      <PageHeader
        icon={GearSixIcon}
        title="Configuración"
        description="Ajusta tu ruta de aprendizaje cuando quieras."
      />

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

      <p className="rounded-2xl border-2 border-teal/25 bg-teal-soft px-4 py-3 text-sm font-semibold text-teal-strong">
        Cambiar de ruta no borra tus misiones, monedas ni repasos.
      </p>
    </main>
  )
}
