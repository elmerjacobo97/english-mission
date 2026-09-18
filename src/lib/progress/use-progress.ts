"use client"

import { useSyncExternalStore } from "react"
import {
  addCoins,
  finishMission,
  getProgressServerSnapshot,
  getProgressSnapshot,
  resetProgress,
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
    finishMission,
    spendCoins,
    reset: resetProgress,
  }
}
