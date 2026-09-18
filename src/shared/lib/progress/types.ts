export type Stars = 0 | 1 | 2 | 3

export type MissionProgress = {
  completed: boolean
  stars: Stars
  bestCoins: number
}

export type ReviewBox = 1 | 2 | 3

export type ReviewCard = {
  box: ReviewBox
  dueAt: number
  lastReviewedAt: number | null
}

export type StreakMilestone = 3 | 7 | 30

export type StreakState = {
  current: number
  best: number
  lastDay: string | null
  pendingMilestone: StreakMilestone | null
}

export type ShopState = {
  day: string | null
  count: number
}

export type CocoLookId = "classic" | "ocean" | "sunset" | "night" | "party"

export type LooksState = {
  owned: CocoLookId[]
  equipped: CocoLookId
}

export type Progress = {
  version: 6
  coins: number
  missions: Record<string, MissionProgress>
  reviews: Record<string, ReviewCard>
  streak: StreakState
  shop: ShopState
  looks: LooksState
}
