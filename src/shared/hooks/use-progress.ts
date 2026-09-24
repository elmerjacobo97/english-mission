"use client"

import { useSyncExternalStore } from "react"
import {
  addCoins,
  buyStreakFreeze,
  clearPendingFreezes,
  clearPendingMilestone,
  getProgressServerSnapshot,
  getProgressSnapshot,
  resetProgress,
  selectLook,
  setCourseBand,
  spendCoins,
  subscribeProgress,
} from "@/shared/lib/progress/progress-store"

export function useProgress() {
  const progress = useSyncExternalStore(
    subscribeProgress,
    getProgressSnapshot,
    getProgressServerSnapshot,
  )

  return {
    progress,
    addCoins,
    buyStreakFreeze,
    spendCoins,
    selectLook,
    setCourseBand,
    clearPendingFreezes,
    clearPendingMilestone,
    reset: resetProgress,
  }
}
