import type { ShopState } from "./types"

export const MAX_DAILY_RECHARGES = 3

export function rechargesUsed(shop: ShopState, day: string): number {
  return shop.day === day ? shop.count : 0
}

export function canRecharge(shop: ShopState, day: string): boolean {
  return rechargesUsed(shop, day) < MAX_DAILY_RECHARGES
}

export function nextShop(shop: ShopState, day: string): ShopState {
  if (shop.day !== day) {
    return { day, count: 1 }
  }
  return { day, count: shop.count + 1 }
}
