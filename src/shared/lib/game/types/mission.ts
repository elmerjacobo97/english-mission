import type { Beat, Vocabulary } from "./beat"
import type { CharacterId } from "./character"

export type Level = 1 | 2 | 3 | 4 | 5
export type Chapter = 1 | 2 | 3
export type CourseBand = "basic" | "intermediate" | "advanced"
export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1"

export type MissionCharacterFunction = "tutor" | "primary" | "support"

export type MissionCastMember = {
  character: CharacterId
  function: MissionCharacterFunction
  objective: string
}

export type MissionPlanEntry = {
  order: number
  slug: string
  title: string
  subtitle: string
  emoji: string
  chapter: Chapter
  band: CourseBand
  cefrLevel: CefrLevel
  level: Level
  cast: MissionCastMember[]
  vocab: Vocabulary[]
  written: boolean
}

export type Mission = MissionPlanEntry & {
  beats: Beat[]
}
