"use client"

import { useSyncExternalStore } from "react"
import {
  addCoins,
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
    spendCoins,
    selectLook,
    setCourseBand,
    clearPendingMilestone,
    reset: resetProgress,
  }
}
