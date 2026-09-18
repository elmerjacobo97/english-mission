import type { MissionPlanEntry } from "@/shared/lib/game/types/mission"
import { missionPlan } from "@/shared/lib/curriculum/plan"
import type { Progress, ReviewBox } from "@/shared/lib/progress/types"

export type ReviewWord = {
  key: string
  en: string
  es: string
  level: MissionPlanEntry["level"]
  chapter: MissionPlanEntry["chapter"]
}

export type ReviewQueueItem = ReviewWord & {
  box: ReviewBox
  dueAt: number
}

export function reviewKey(en: string): string {
  return en.trim().toLowerCase()
}

export function buildReviewPool(
  progress: Progress,
  entries: MissionPlanEntry[] = missionPlan,
): ReviewWord[] {
  const pool = new Map<string, ReviewWord>()
  for (const entry of entries) {
    if (progress.missions[entry.slug]?.completed !== true) {
      continue
    }
    for (const [en, es] of entry.vocab) {
      const key = reviewKey(en)
      if (!pool.has(key)) {
        pool.set(key, {
          key,
          en,
          es,
          level: entry.level,
          chapter: entry.chapter,
        })
      }
    }
  }
  return [...pool.values()]
}

export function buildReviewQueue(
  progress: Progress,
  now: number,
  limit = 10,
): ReviewQueueItem[] {
  return buildReviewPool(progress)
    .map((word) => {
      const card = progress.reviews[word.key]
      return {
        ...word,
        box: card?.box ?? 1,
        dueAt: card?.dueAt ?? now,
      }
    })
    .filter((word) => word.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, limit)
}
