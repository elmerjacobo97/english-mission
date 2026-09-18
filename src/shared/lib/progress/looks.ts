import type { CocoLookId, LooksState } from "./types"

export const LOOK_PRICES: Record<CocoLookId, number> = {
  classic: 0,
  ocean: 25,
  sunset: 40,
  night: 60,
  party: 80,
}

export const PAID_LOOK_IDS = ["ocean", "sunset", "night", "party"] as const

export function isOwned(looks: LooksState, id: CocoLookId): boolean {
  return id === "classic" || looks.owned.includes(id)
}

export function canBuy(
  looks: LooksState,
  coins: number,
  id: CocoLookId,
): boolean {
  return !isOwned(looks, id) && LOOK_PRICES[id] > 0 && coins >= LOOK_PRICES[id]
}

export function nextLooks(looks: LooksState, id: CocoLookId): LooksState {
  if (isOwned(looks, id)) {
    return { ...looks, equipped: id }
  }
  return { owned: [...looks.owned, id], equipped: id }
}
