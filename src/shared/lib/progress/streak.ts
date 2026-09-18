import type { StreakMilestone, StreakState } from "./types"

export const STREAK_MILESTONES: Record<StreakMilestone, number> = {
  3: 10,
  7: 25,
  30: 50,
}

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

export function nextStreak(
  state: StreakState,
  day: string,
): { streak: StreakState; payout: number } {
  if (state.lastDay === day) {
    return { streak: state, payout: 0 }
  }
  const current = state.lastDay === previousDayKey(day) ? state.current + 1 : 1
  const milestone = milestoneFor(current)
  return {
    streak: {
      current,
      best: Math.max(state.best, current),
      lastDay: day,
      pendingMilestone: milestone ?? state.pendingMilestone,
    },
    payout: milestone ? STREAK_MILESTONES[milestone] : 0,
  }
}
