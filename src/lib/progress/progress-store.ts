import { nextCard } from "@/features/review/utils/schedule"
import { localDayKey, nextStreak } from "./streak"
import type {
  MissionProgress,
  Progress,
  ReviewCard,
  Stars,
  StreakState,
} from "./types"

const STORAGE_KEY = "english-mission:progress:v4"
const LEGACY_V3_KEY = "english-mission:progress:v3"
const LEGACY_V2_KEY = "english-mission:progress:v2"
const LEGACY_V1_KEY = "english-mission:progress:v1"

const emptyStreak: StreakState = {
  current: 0,
  best: 0,
  lastDay: null,
  pendingMilestone: null,
}

export const emptyProgress: Progress = {
  version: 4,
  coins: 0,
  missions: {},
  reviews: {},
  streak: emptyStreak,
}

let current: Progress | null = null
const listeners = new Set<() => void>()

function isMissionProgress(value: unknown): value is MissionProgress {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const candidate = value as Partial<MissionProgress>
  return (
    candidate.completed === true &&
    typeof candidate.stars === "number" &&
    candidate.stars >= 0 &&
    candidate.stars <= 3 &&
    typeof candidate.bestCoins === "number" &&
    candidate.bestCoins >= 0
  )
}

function isMissionMap(value: unknown): value is Record<string, MissionProgress> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every(isMissionProgress)
  )
}

function isReviewCard(value: unknown): value is ReviewCard {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const candidate = value as Partial<ReviewCard>
  return (
    (candidate.box === 1 || candidate.box === 2 || candidate.box === 3) &&
    typeof candidate.dueAt === "number" &&
    Number.isFinite(candidate.dueAt) &&
    (candidate.lastReviewedAt === null ||
      (typeof candidate.lastReviewedAt === "number" &&
        Number.isFinite(candidate.lastReviewedAt)))
  )
}

function isReviewMap(value: unknown): value is Record<string, ReviewCard> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every(isReviewCard)
  )
}

function isStreakState(value: unknown): value is StreakState {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const candidate = value as Partial<StreakState>
  return (
    typeof candidate.current === "number" &&
    Number.isInteger(candidate.current) &&
    candidate.current >= 0 &&
    typeof candidate.best === "number" &&
    Number.isInteger(candidate.best) &&
    candidate.best >= 0 &&
    (candidate.lastDay === null ||
      (typeof candidate.lastDay === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(candidate.lastDay))) &&
    (candidate.pendingMilestone === null ||
      candidate.pendingMilestone === 3 ||
      candidate.pendingMilestone === 7 ||
      candidate.pendingMilestone === 30)
  )
}

function isProgress(value: unknown): value is Progress {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const candidate = value as Partial<Progress>
  return (
    candidate.version === 4 &&
    typeof candidate.coins === "number" &&
    Number.isFinite(candidate.coins) &&
    candidate.coins >= 0 &&
    isMissionMap(candidate.missions) &&
    isReviewMap(candidate.reviews) &&
    isStreakState(candidate.streak)
  )
}

function parseStorage(key: string): unknown {
  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function migrateV3(parsed: unknown): Progress | null {
  if (typeof parsed !== "object" || parsed === null) {
    return null
  }
  const legacy = parsed as {
    version?: number
    coins?: number
    missions?: unknown
    reviews?: unknown
  }
  if (
    legacy.version !== 3 ||
    typeof legacy.coins !== "number" ||
    !Number.isFinite(legacy.coins) ||
    legacy.coins < 0 ||
    !isMissionMap(legacy.missions) ||
    !isReviewMap(legacy.reviews)
  ) {
    return null
  }
  return {
    version: 4,
    coins: legacy.coins,
    missions: legacy.missions,
    reviews: legacy.reviews,
    streak: { ...emptyStreak },
  }
}

function migrateV2(parsed: unknown): Progress | null {
  if (typeof parsed !== "object" || parsed === null) {
    return null
  }
  const legacy = parsed as { version?: number; coins?: number; missions?: unknown }
  if (
    legacy.version !== 2 ||
    typeof legacy.coins !== "number" ||
    !Number.isFinite(legacy.coins) ||
    legacy.coins < 0 ||
    !isMissionMap(legacy.missions)
  ) {
    return null
  }
  return {
    version: 4,
    coins: legacy.coins,
    missions: legacy.missions,
    reviews: {},
    streak: { ...emptyStreak },
  }
}

function migrateV1(parsed: unknown): Progress | null {
  if (typeof parsed !== "object" || parsed === null) {
    return null
  }
  const legacy = parsed as { version?: number; coins?: number; completed?: unknown }
  if (
    legacy.version !== 1 ||
    typeof legacy.coins !== "number" ||
    !Array.isArray(legacy.completed)
  ) {
    return null
  }
  const missions: Record<string, MissionProgress> = {}
  for (const slug of legacy.completed) {
    if (typeof slug === "string") {
      missions[slug] = { completed: true, stars: 1, bestCoins: 0 }
    }
  }
  return {
    version: 4,
    coins: legacy.coins,
    missions,
    reviews: {},
    streak: { ...emptyStreak },
  }
}

function read(): Progress {
  if (typeof window === "undefined") {
    return emptyProgress
  }
  try {
    const stored = parseStorage(STORAGE_KEY)
    if (isProgress(stored)) {
      return stored
    }
    const migrated =
      migrateV3(parseStorage(LEGACY_V3_KEY)) ??
      migrateV2(parseStorage(LEGACY_V2_KEY)) ??
      migrateV1(parseStorage(LEGACY_V1_KEY))
    if (migrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      window.localStorage.removeItem(LEGACY_V3_KEY)
      window.localStorage.removeItem(LEGACY_V2_KEY)
      window.localStorage.removeItem(LEGACY_V1_KEY)
      return migrated
    }
    return emptyProgress
  } catch {
    return emptyProgress
  }
}

function persist(next: Progress): void {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    return
  }
}

function mutation(next: Progress): void {
  current = next
  persist(next)
  listeners.forEach((listener) => listener())
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getProgressSnapshot(): Progress {
  if (current === null) {
    current = read()
  }
  return current
}

export function getProgressServerSnapshot(): Progress {
  return emptyProgress
}

export function reloadProgress(): void {
  current = null
  listeners.forEach((listener) => listener())
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
  mutation({ ...progress, coins: progress.coins + amount })
}

export function spendCoins(amount: number): boolean {
  const progress = getProgressSnapshot()
  if (progress.coins < amount) {
    return false
  }
  mutation({ ...progress, coins: progress.coins - amount })
  return true
}

export function recordMissionResult(
  slug: string,
  result: { stars: Stars; payout: number; bestCoins: number },
): void {
  const progress = getProgressSnapshot()
  const previous = progress.missions[slug]
  mutation({
    ...progress,
    coins: progress.coins + result.payout,
    missions: {
      ...progress.missions,
      [slug]: {
        completed: true,
        stars: Math.max(previous?.stars ?? 0, result.stars) as Stars,
        bestCoins: Math.max(previous?.bestCoins ?? 0, result.bestCoins),
      },
    },
  })
}

export function recordReviewResult(
  key: string,
  passed: boolean,
  now: number = Date.now(),
): void {
  const progress = getProgressSnapshot()
  const previous = progress.reviews[key] ?? {
    box: 1,
    dueAt: now,
    lastReviewedAt: null,
  }
  mutation({
    ...progress,
    reviews: {
      ...progress.reviews,
      [key]: nextCard(previous, passed, now),
    },
  })
}

export function registerDailyActivity(now: number = Date.now()): void {
  const progress = getProgressSnapshot()
  const day = localDayKey(new Date(now))
  if (progress.streak.lastDay === day) {
    return
  }
  const { streak, payout } = nextStreak(progress.streak, day)
  mutation({ ...progress, coins: progress.coins + payout, streak })
}

export function clearPendingMilestone(): void {
  const progress = getProgressSnapshot()
  if (progress.streak.pendingMilestone === null) {
    return
  }
  mutation({
    ...progress,
    streak: { ...progress.streak, pendingMilestone: null },
  })
}

export function resetProgress(): void {
  current = emptyProgress
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_V3_KEY)
    window.localStorage.removeItem(LEGACY_V2_KEY)
    window.localStorage.removeItem(LEGACY_V1_KEY)
  }
  listeners.forEach((listener) => listener())
}
