import type { Progress } from "./types"

const STORAGE_KEY = "english-mission:progress:v1"

export const emptyProgress: Progress = { version: 1, coins: 0, completed: [] }

let current: Progress | null = null
const listeners = new Set<() => void>()

function isProgress(value: unknown): value is Progress {
  if (typeof value !== "object" || value === null) {
    return false
  }
  const candidate = value as Partial<Progress>
  return (
    candidate.version === 1 &&
    typeof candidate.coins === "number" &&
    Number.isFinite(candidate.coins) &&
    candidate.coins >= 0 &&
    Array.isArray(candidate.completed) &&
    candidate.completed.every((slug) => typeof slug === "string")
  )
}

function read(): Progress {
  if (typeof window === "undefined") {
    return emptyProgress
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return emptyProgress
    }
    const parsed: unknown = JSON.parse(raw)
    return isProgress(parsed) ? parsed : emptyProgress
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

function write(next: Progress): void {
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

export function spendCoins(amount: number): boolean {
  const progress = getProgressSnapshot()
  if (progress.coins < amount) {
    return false
  }
  write({ ...progress, coins: progress.coins - amount })
  return true
}

export function addCoins(amount: number): void {
  const progress = getProgressSnapshot()
  write({ ...progress, coins: progress.coins + amount })
}

export function finishMission(slug: string, bonusCoins: number): void {
  const progress = getProgressSnapshot()
  const alreadyCompleted = progress.completed.includes(slug)
  write({
    ...progress,
    coins: progress.coins + (alreadyCompleted ? 0 : bonusCoins),
    completed: alreadyCompleted
      ? progress.completed
      : [...progress.completed, slug],
  })
}

export function resetProgress(): void {
  current = emptyProgress
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY)
  }
  listeners.forEach((listener) => listener())
}
