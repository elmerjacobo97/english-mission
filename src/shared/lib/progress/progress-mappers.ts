import type {
  CocoLookId,
  LooksState,
  MissionProgress,
  Progress,
  ReviewCard,
  ShopState,
  Stars,
  StreakState,
} from "./types"
import type { CourseBand } from "../game/types/mission"
import { PAID_LOOK_IDS } from "./looks"

export type CoreRow = {
  user_id?: string
  coins: number
  course_band?: CourseBand | null
  updated_at?: string | null
}

export type StreakRow = {
  user_id?: string
  current: number
  best: number
  last_day: string | null
  pending_milestone: number | null
  freezes?: number
  pending_freezes_used?: number
}

export type ShopRow = {
  user_id?: string
  day: string | null
  count: number
}

export type LooksRow = {
  user_id?: string
  equipped: string
  owned: string[]
}

export type MissionRow = {
  user_id?: string
  slug: string
  completed: boolean
  stars: number
  best_coins: number
}

export type ReviewRow = {
  user_id?: string
  word_key: string
  box: number
  due_at: number
  last_reviewed_at: number | null
}

export type ProgressRows = {
  core: CoreRow | null
  streak: StreakRow | null
  shop: ShopRow | null
  looks: LooksRow | null
  missions: MissionRow[] | null
  reviews: ReviewRow[] | null
}

export const CORE_ROW_DEFAULTS: CoreRow = { coins: 0, course_band: null }

export const emptyProgress: Progress = {
  version: 8,
  courseBand: null,
  coins: 0,
  missions: {},
  reviews: {},
  streak: {
    current: 0,
    best: 0,
    lastDay: null,
    pendingMilestone: null,
    freezes: 0,
    pendingFreezesUsed: 0,
  },
  shop: { day: null, count: 0 },
  looks: { owned: [], equipped: "classic" },
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
}

function isDateKey(value: unknown): value is string {
  return typeof value === "string" && DATE_PATTERN.test(value)
}

function isOptionalFreezeCount(value: unknown): boolean {
  return (
    value === undefined ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 2)
  )
}

function isCourseBand(value: unknown): value is CourseBand {
  return value === "basic" || value === "intermediate" || value === "advanced"
}

function isPaidLookId(value: unknown): value is (typeof PAID_LOOK_IDS)[number] {
  return (
    typeof value === "string" &&
    (PAID_LOOK_IDS as readonly string[]).includes(value)
  )
}

function isLookId(value: unknown): value is CocoLookId {
  return value === "classic" || isPaidLookId(value)
}

export function isCoreRow(value: unknown): value is CoreRow {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const row = value as Partial<CoreRow>
  return (
    isNonNegativeInteger(row.coins) &&
    (row.updated_at === undefined ||
      row.updated_at === null ||
      typeof row.updated_at === "string")
  )
}

export function isStreakRow(value: unknown): value is StreakRow {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const row = value as Partial<StreakRow>
  return (
    isNonNegativeInteger(row.current) &&
    isNonNegativeInteger(row.best) &&
    (row.last_day === null || isDateKey(row.last_day)) &&
    (row.pending_milestone === null ||
      row.pending_milestone === 3 ||
      row.pending_milestone === 7 ||
      row.pending_milestone === 30) &&
    isOptionalFreezeCount(row.freezes) &&
    isOptionalFreezeCount(row.pending_freezes_used)
  )
}

export function isShopRow(value: unknown): value is ShopRow {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const row = value as Partial<ShopRow>
  return (
    isNonNegativeInteger(row.count) &&
    (row.day === null || isDateKey(row.day))
  )
}

export function isLooksRow(value: unknown): value is LooksRow {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const row = value as Partial<LooksRow>
  if (!Array.isArray(row.owned) || !row.owned.every(isPaidLookId)) {
    return false
  }
  if (new Set(row.owned).size !== row.owned.length || !isLookId(row.equipped)) {
    return false
  }
  return row.equipped === "classic" || row.owned.includes(row.equipped)
}

export function isMissionRow(value: unknown): value is MissionRow {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const row = value as Partial<MissionRow>
  return (
    typeof row.slug === "string" &&
    row.slug.trim().length > 0 &&
    typeof row.completed === "boolean" &&
    isNonNegativeInteger(row.stars) &&
    row.stars <= 3 &&
    isNonNegativeInteger(row.best_coins)
  )
}

export function isReviewRow(value: unknown): value is ReviewRow {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const row = value as Partial<ReviewRow>
  return (
    typeof row.word_key === "string" &&
    row.word_key.length > 0 &&
    row.word_key === row.word_key.trim().toLowerCase() &&
    isNonNegativeInteger(row.box) &&
    row.box >= 1 &&
    row.box <= 3 &&
    isFiniteNumber(row.due_at) &&
    Number.isInteger(row.due_at) &&
    (row.last_reviewed_at === null ||
      (isFiniteNumber(row.last_reviewed_at) &&
        Number.isInteger(row.last_reviewed_at)))
  )
}

export function toProgress(rows: ProgressRows): Progress {
  const core = isCoreRow(rows.core) ? rows.core : CORE_ROW_DEFAULTS
  const streak = isStreakRow(rows.streak)
    ? {
        current: rows.streak.current,
        best: rows.streak.best,
        lastDay: rows.streak.last_day,
        pendingMilestone: rows.streak.pending_milestone as StreakState["pendingMilestone"],
        freezes: rows.streak.freezes ?? 0,
        pendingFreezesUsed: rows.streak.pending_freezes_used ?? 0,
      }
    : emptyProgress.streak
  const shop = isShopRow(rows.shop)
    ? { day: rows.shop.day, count: rows.shop.count }
    : emptyProgress.shop
  const looks = isLooksRow(rows.looks)
    ? { owned: [...rows.looks.owned], equipped: rows.looks.equipped }
    : emptyProgress.looks
  const missions: Record<string, MissionProgress> = {}
  const reviews: Record<string, ReviewCard> = {}

  for (const row of rows.missions ?? []) {
    if (isMissionRow(row)) {
      missions[row.slug] = {
        completed: row.completed,
        stars: row.stars as Stars,
        bestCoins: row.best_coins,
      }
    }
  }

  for (const row of rows.reviews ?? []) {
    if (isReviewRow(row)) {
      reviews[row.word_key] = {
        box: row.box as ReviewCard["box"],
        dueAt: row.due_at,
        lastReviewedAt: row.last_reviewed_at,
      }
    }
  }

  return {
    version: 8,
    courseBand: isCourseBand(core.course_band) ? core.course_band : null,
    coins: core.coins,
    missions,
    reviews,
    streak,
    shop: { day: shop.day, count: shop.count },
    looks: {
      owned: [...looks.owned] as LooksState["owned"],
      equipped: looks.equipped as CocoLookId,
    },
  }
}

export function corePayload(
  coins: number,
  courseBand: CourseBand | null,
  updatedAt: string = new Date().toISOString(),
): CoreRow {
  return { coins, course_band: courseBand, updated_at: updatedAt }
}

export function streakPayload(streak: StreakState): StreakRow {
  return {
    current: streak.current,
    best: streak.best,
    last_day: streak.lastDay,
    pending_milestone: streak.pendingMilestone,
    freezes: streak.freezes,
    pending_freezes_used: streak.pendingFreezesUsed,
  }
}

export function shopPayload(shop: ShopState): ShopRow {
  return { day: shop.day, count: shop.count }
}

export function looksPayload(looks: LooksState): LooksRow {
  return { owned: [...looks.owned], equipped: looks.equipped }
}

export function missionPayload(
  slug: string,
  mission: MissionProgress,
): MissionRow {
  return {
    slug,
    completed: mission.completed,
    stars: mission.stars,
    best_coins: mission.bestCoins,
  }
}

export function reviewPayload(key: string, card: ReviewCard): ReviewRow {
  return {
    word_key: key,
    box: card.box,
    due_at: card.dueAt,
    last_reviewed_at: card.lastReviewedAt,
  }
}
