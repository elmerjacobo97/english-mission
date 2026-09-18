import type { Progress } from "@/lib/progress/types"
import type { Beat } from "@/lib/game/types/beat"
import type { Chapter, Mission, MissionPlanEntry } from "@/lib/game/types/mission"
import { mission01Beats } from "./missions/mission-01-la-llegada"
import { mission02Beats } from "./missions/mission-02-supermercado"
import { mission03Beats } from "./missions/mission-03-direcciones"
import { mission04Beats } from "./missions/mission-04-cafe"
import { missionPlan } from "./plan"

export const CHAPTER_TITLES: Record<Chapter, string> = {
  1: "Primeros pasos",
  2: "La ciudad",
  3: "La vida",
}

const beatsBySlug: Record<string, Beat[]> = {
  "la-llegada": mission01Beats,
  supermercado: mission02Beats,
  direcciones: mission03Beats,
  cafe: mission04Beats,
}

export const missions: Mission[] = missionPlan
  .filter((entry) => entry.written)
  .map((entry) => ({ ...entry, beats: beatsBySlug[entry.slug] ?? [] }))

export function findMission(slug: string): Mission | undefined {
  return missions.find((mission) => mission.slug === slug)
}

export function findPlanEntry(slug: string): MissionPlanEntry | undefined {
  return missionPlan.find((entry) => entry.slug === slug)
}

export function chapterEntries(chapter: Chapter): MissionPlanEntry[] {
  return missionPlan.filter((entry) => entry.chapter === chapter)
}

export function isUnlocked(entry: MissionPlanEntry, progress: Progress): boolean {
  if (entry.order === 1) {
    return true
  }
  const previous = missionPlan.find((item) => item.order === entry.order - 1)
  if (!previous) {
    return false
  }
  return progress.missions[previous.slug]?.completed === true
}

export function nextMissionSlug(progress: Progress): string | null {
  const candidate = missions.find((mission) => {
    const stars = progress.missions[mission.slug]?.stars ?? 0
    return stars < 3 && isUnlocked(mission, progress)
  })
  return candidate?.slug ?? null
}
