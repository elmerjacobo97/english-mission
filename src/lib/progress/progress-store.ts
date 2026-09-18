import type { MissionProgress, Progress, Stars } from "./types"

const STORAGE_KEY = "english-mission:progress:v2"
const LEGACY_STORAGE_KEY = "english-mission:progress:v1"

export const emptyProgress: Progress = { version: 2, coins: 0, missions: {} }

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

function isProgress(value: unknown): value is Progress {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const candidate = value as Partial<Progress>
  return (
    candidate.version === 2 &&
    typeof candidate.coins === "number" &&
    Number.isFinite(candidate.coins) &&
    candidate.coins >= 0 &&
    typeof candidate.missions === "object" &&
    candidate.missions !== null &&
    Object.values(candidate.missions).every(isMissionProgress)
  )
}

function migrateLegacy(): Progress | null {
  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
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
    return { version: 2, coins: legacy.coins, missions }
  } catch {
    return null
  }
}

function read(): Progress {
  if (typeof window === "undefined") {
    return emptyProgress
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isProgress(parsed)) {
        return parsed
      }
    }
    const migrated = migrateLegacy()
    if (migrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
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

export function resetProgress(): void {
  current = emptyProgress
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  }
  listeners.forEach((listener) => listener())
}
