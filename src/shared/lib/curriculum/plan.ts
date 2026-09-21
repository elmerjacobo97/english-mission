import type { MissionPlanEntry } from "@/shared/lib/game/types/mission"
import planData from "./plan.json"

export const missionPlan: MissionPlanEntry[] =
  planData as unknown as MissionPlanEntry[]
