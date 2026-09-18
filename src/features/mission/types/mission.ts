import type { Beat } from "./beat"

export type Mission = {
  slug: string
  title: string
  subtitle: string
  emoji: string
  bonusCoins: number
  beats: Beat[]
}
