"use client"

import { useSyncExternalStore } from "react"
import {
  addCoins,
  clearPendingMilestone,
  getProgressServerSnapshot,
  getProgressSnapshot,
  resetProgress,
  selectLook,
  spendCoins,
  subscribeProgress,
} from "./progress-store"

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
    clearPendingMilestone,
    reset: resetProgress,
  }
}
