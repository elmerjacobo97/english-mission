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

export type Progress = {
  version: 3
  coins: number
  missions: Record<string, MissionProgress>
  reviews: Record<string, ReviewCard>
}
