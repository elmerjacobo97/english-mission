import type { CourseBand } from "@/shared/lib/game/types/mission"

export const COURSE_BANDS: Record<
  CourseBand,
  { title: string; range: string; description: string; emoji: string }
> = {
  basic: {
    title: "Básico",
    range: "A1–A2",
    description: "Saluda, pide ayuda y resuelve situaciones cotidianas.",
    emoji: "🌱",
  },
  intermediate: {
    title: "Intermedio",
    range: "B1–B2",
    description: "Cuenta tus experiencias y comunícate con más soltura.",
    emoji: "🧭",
  },
  advanced: {
    title: "Avanzado",
    range: "C1",
    description: "Expresa ideas complejas con precisión y naturalidad.",
    emoji: "🚀",
  },
}

export const COURSE_BAND_ORDER: CourseBand[] = [
  "basic",
  "intermediate",
  "advanced",
]
