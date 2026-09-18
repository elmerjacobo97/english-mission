import type { Beat, Vocabulary } from "./beat"
import type { CharacterId } from "./character"

export type Level = 1 | 2 | 3 | 4 | 5
export type Chapter = 1 | 2 | 3

export type MissionPlanEntry = {
  order: number
  slug: string
  title: string
  subtitle: string
  emoji: string
  chapter: Chapter
  level: Level
  cast: CharacterId[]
  vocab: Vocabulary[]
  written: boolean
}

export type Mission = MissionPlanEntry & {
  beats: Beat[]
}
