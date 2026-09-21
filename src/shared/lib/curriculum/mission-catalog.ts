import type { Progress } from "@/shared/lib/progress/types"
import type { Beat } from "@/shared/lib/game/types/beat"
import type { Chapter, Mission, MissionPlanEntry } from "@/shared/lib/game/types/mission"
import mission01Data from "./missions/mission-01-arrival.json"
import mission02Data from "./missions/mission-02-supermarket.json"
import mission03Data from "./missions/mission-03-directions.json"
import mission04Data from "./missions/mission-04-cafe.json"
import mission05Data from "./missions/mission-05-bus.json"
import mission06Data from "./missions/mission-06-laundry.json"
import mission07Data from "./missions/mission-07-clothes.json"
import mission08Data from "./missions/mission-08-landlord.json"
import { missionPlan } from "./plan"

export const CHAPTER_TITLES: Record<Chapter, string> = {
  1: "Primeros pasos",
  2: "La ciudad",
  3: "La vida",
}

const beatsBySlug: Record<string, Beat[]> = {
  arrival: mission01Data as unknown as Beat[],
  supermarket: mission02Data as unknown as Beat[],
  directions: mission03Data as unknown as Beat[],
  cafe: mission04Data as unknown as Beat[],
  bus: mission05Data as unknown as Beat[],
  laundry: mission06Data as unknown as Beat[],
  clothes: mission07Data as unknown as Beat[],
  landlord: mission08Data as unknown as Beat[],
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
