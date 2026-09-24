import type { StreakMilestone, StreakState } from "./types"

export const STREAK_MILESTONES: Record<StreakMilestone, number> = {
  3: 10,
  7: 25,
  30: 50,
}

export const STREAK_FREEZE_PRICE = 20
export const STREAK_FREEZE_MAX = 2

function milestoneFor(day: number): StreakMilestone | null {
  return day === 3 || day === 7 || day === 30 ? day : null
}

export function localDayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function previousDayKey(day: string): string {
  const [year, month, dayOfMonth] = day.split("-").map(Number)
  return localDayKey(new Date(year, month - 1, dayOfMonth - 1))
}

function skippedDays(lastDay: string, day: string): number {
  let skipped = 0
  let cursor = previousDayKey(day)
  while (cursor !== lastDay && skipped <= STREAK_FREEZE_MAX) {
    skipped += 1
    cursor = previousDayKey(cursor)
  }
  return skipped
}

export function nextStreak(
  state: StreakState,
  day: string,
): { streak: StreakState; payout: number } {
  if (state.lastDay === day) {
    return { streak: state, payout: 0 }
  }

  let current = 1
  let freezes = state.freezes
  let pendingFreezesUsed = 0

  if (state.current > 0 && state.lastDay !== null) {
    const skipped = skippedDays(state.lastDay, day)
    if (skipped === 0) {
      current = state.current + 1
      pendingFreezesUsed = state.pendingFreezesUsed
    } else if (freezes >= skipped) {
      current = state.current + 1
      freezes -= skipped
      pendingFreezesUsed = skipped
    }
  }

  const milestone = milestoneFor(current)
  return {
    streak: {
      current,
      best: Math.max(state.best, current),
      lastDay: day,
      pendingMilestone: milestone ?? state.pendingMilestone,
      freezes,
      pendingFreezesUsed,
    },
    payout: milestone ? STREAK_MILESTONES[milestone] : 0,
  }
}
