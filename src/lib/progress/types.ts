export type Stars = 0 | 1 | 2 | 3

export type MissionProgress = {
  completed: boolean
  stars: Stars
  bestCoins: number
}

export type Progress = {
  version: 2
  coins: number
  missions: Record<string, MissionProgress>
}
