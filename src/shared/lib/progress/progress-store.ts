import { nextCard } from "@/shared/lib/review/schedule"
import * as progressSync from "./progress-sync"
import type { ProgressTable, SyncOperation } from "./progress-sync"
import { canBuy, isOwned, LOOK_PRICES, nextLooks } from "./looks"
import { canRecharge, nextShop } from "./shop"
import { localDayKey, nextStreak, STREAK_FREEZE_MAX, STREAK_FREEZE_PRICE } from "./streak"
import type { CourseBand } from "../game/types/mission"
import {
  corePayload,
  emptyProgress,
  looksPayload,
  missionPayload,
  reviewPayload,
  shopPayload,
  streakPayload,
} from "./progress-mappers"
import type {
  CocoLookId,
  MissionProgress,
  Progress,
  Stars,
} from "./types"

export { emptyProgress } from "./progress-mappers"

let current: Progress | null = null
let currentUserId = ""
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

function userPayload(payload: Record<string, unknown>): Record<string, unknown> {
  return { user_id: currentUserId, ...payload }
}

function upsert(
  table: ProgressTable,
  payload: Record<string, unknown>,
): SyncOperation | null {
  if (!currentUserId) {
    return null
  }
  return { action: "upsert", table, payload: userPayload(payload) }
}

function mutation(next: Progress, operations: Array<SyncOperation | null>): void {
  current = next
  notify()
  operations.forEach((operation) => {
    if (operation) {
      progressSync.enqueue(operation)
    }
  })
}

export function initProgress(progress: Progress, userId: string): void {
  current = progress
  currentUserId = userId
  notify()
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getProgressSnapshot(): Progress {
  return current ?? emptyProgress
}

export function getProgressServerSnapshot(): Progress {
  return emptyProgress
}

export function getMissionProgress(slug: string): MissionProgress {
  return (
    getProgressSnapshot().missions[slug] ?? {
      completed: false,
      stars: 0,
      bestCoins: 0,
    }
  )
}

export function addCoins(amount: number): void {
  const progress = getProgressSnapshot()
  mutation(
    { ...progress, coins: progress.coins + amount },
    [upsert("progress_core", corePayload(progress.coins + amount, progress.courseBand))],
  )
}

export function spendCoins(amount: number): boolean {
  const progress = getProgressSnapshot()
  if (progress.coins < amount) {
    return false
  }
  mutation(
    { ...progress, coins: progress.coins - amount },
    [upsert("progress_core", corePayload(progress.coins - amount, progress.courseBand))],
  )
  return true
}

export function buyStreakFreeze(): boolean {
  const progress = getProgressSnapshot()
  if (
    progress.coins < STREAK_FREEZE_PRICE ||
    progress.streak.freezes >= STREAK_FREEZE_MAX
  ) {
    return false
  }
  const coins = progress.coins - STREAK_FREEZE_PRICE
  const streak = { ...progress.streak, freezes: progress.streak.freezes + 1 }
  mutation(
    { ...progress, coins, streak },
    [
      upsert("streak_state", streakPayload(streak)),
      upsert("progress_core", corePayload(coins, progress.courseBand)),
    ],
  )
  return true
}

export function selectLook(id: CocoLookId): boolean {
  const progress = getProgressSnapshot()
  if (isOwned(progress.looks, id)) {
    if (progress.looks.equipped === id) {
      return true
    }
    const looks = { ...progress.looks, equipped: id }
    mutation(
      { ...progress, looks },
      [upsert("looks_state", looksPayload(looks))],
    )
    return true
  }
  if (!canBuy(progress.looks, progress.coins, id)) {
    return false
  }
  const looks = nextLooks(progress.looks, id)
  const coins = progress.coins - LOOK_PRICES[id]
  mutation(
    { ...progress, coins, looks },
    [
      upsert("looks_state", looksPayload(looks)),
      upsert("progress_core", corePayload(coins, progress.courseBand)),
    ],
  )
  return true
}

export function recordRecharge(
  payout: number,
  now: number = Date.now(),
): boolean {
  const progress = getProgressSnapshot()
  const day = localDayKey(new Date(now))
  if (!canRecharge(progress.shop, day)) {
    return false
  }
  const shop = nextShop(progress.shop, day)
  const coins = progress.coins + payout
  mutation(
    { ...progress, coins, shop },
    [
      upsert("shop_state", shopPayload(shop)),
      upsert("progress_core", corePayload(coins, progress.courseBand)),
    ],
  )
  return true
}

export function recordMissionResult(
  slug: string,
  result: { stars: Stars; payout: number; bestCoins: number },
): void {
  const progress = getProgressSnapshot()
  const previous = progress.missions[slug]
  const mission: MissionProgress = {
    completed: true,
    stars: Math.max(previous?.stars ?? 0, result.stars) as Stars,
    bestCoins: Math.max(previous?.bestCoins ?? 0, result.bestCoins),
  }
  const coins = progress.coins + result.payout
  mutation(
    {
      ...progress,
      coins,
      missions: { ...progress.missions, [slug]: mission },
    },
    [
      upsert("progress_core", corePayload(coins, progress.courseBand)),
      upsert("mission_progress", missionPayload(slug, mission)),
    ],
  )
}

export function recordReviewResult(
  key: string,
  passed: boolean,
  now: number = Date.now(),
): void {
  const progress = getProgressSnapshot()
  const previous = progress.reviews[key] ?? {
    box: 1 as const,
    dueAt: now,
    lastReviewedAt: null,
  }
  const card = nextCard(previous, passed, now)
  mutation(
    { ...progress, reviews: { ...progress.reviews, [key]: card } },
    [upsert("review_cards", reviewPayload(key, card))],
  )
}

export function registerDailyActivity(now: number = Date.now()): void {
  const progress = getProgressSnapshot()
  const day = localDayKey(new Date(now))
  if (progress.streak.lastDay === day) {
    return
  }
  const { streak, payout } = nextStreak(progress.streak, day)
  const coins = progress.coins + payout
  mutation(
    { ...progress, coins, streak },
    [
      upsert("streak_state", streakPayload(streak)),
      upsert("progress_core", corePayload(coins, progress.courseBand)),
    ],
  )
}

export function clearPendingMilestone(): void {
  const progress = getProgressSnapshot()
  if (progress.streak.pendingMilestone === null) {
    return
  }
  const streak = { ...progress.streak, pendingMilestone: null }
  mutation(
    { ...progress, streak },
    [upsert("streak_state", streakPayload(streak))],
  )
}

export function clearPendingFreezes(): void {
  const progress = getProgressSnapshot()
  if (progress.streak.pendingFreezesUsed === 0) {
    return
  }
  const streak = { ...progress.streak, pendingFreezesUsed: 0 }
  mutation(
    { ...progress, streak },
    [upsert("streak_state", streakPayload(streak))],
  )
}

export function setCourseBand(courseBand: CourseBand): void {
  const progress = getProgressSnapshot()
  if (progress.courseBand === courseBand) {
    return
  }
  mutation(
    { ...progress, courseBand },
    [upsert("progress_core", corePayload(progress.coins, courseBand))],
  )
}

export function resetProgress(): void {
  const courseBand = getProgressSnapshot().courseBand
  current = { ...emptyProgress, courseBand }
  notify()

  if (!currentUserId) {
    return
  }

  const tables: ProgressTable[] = [
    "streak_state",
    "shop_state",
    "looks_state",
    "mission_progress",
    "review_cards",
  ]
  tables.forEach((table) => {
    progressSync.enqueue({ action: "delete", table, userId: currentUserId })
  })
  progressSync.enqueue({
    action: "upsert",
    table: "progress_core",
    payload: userPayload(corePayload(0, courseBand)),
  })
}
