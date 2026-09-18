"use client"

import { useState, useSyncExternalStore } from "react"
import type { Challenge } from "@/features/mission/types/beat"
import type { ChallengeOutcome } from "@/features/mission/types/run"
import {
  profileFor,
  type DifficultyProfile,
} from "@/features/mission/utils/difficulty"
import {
  getProgressSnapshot,
  recordReviewResult,
} from "@/lib/progress/progress-store"
import { buildReviewChallenge } from "../utils/review-exercise"
import {
  buildReviewPool,
  buildReviewQueue,
  type ReviewQueueItem,
  type ReviewWord,
} from "../utils/review-queue"

export type ReviewStats = {
  reviewed: number
  promoted: number
  repeated: number
}

export type ReviewPhase = "playing" | "complete"

type ReviewSession = {
  items: ReviewQueueItem[]
  pool: ReviewWord[]
}

const EMPTY_SESSION: ReviewSession = { items: [], pool: [] }

function createSessionStore() {
  let snapshot: ReviewSession | null = null
  const listeners = new Set<() => void>()

  function getSnapshot(): ReviewSession {
    if (snapshot === null) {
      const progress = getProgressSnapshot()
      const now = Date.now()
      snapshot = {
        items: buildReviewQueue(progress, now),
        pool: buildReviewPool(progress),
      }
    }
    return snapshot
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot,
    getServerSnapshot: () => EMPTY_SESSION,
    reset() {
      snapshot = null
      getSnapshot()
      listeners.forEach((listener) => listener())
    },
  }
}

export function useReviewRun(speechAvailable: boolean) {
  const [store] = useState(createSessionStore)
  const session = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )
  const [index, setIndex] = useState(0)
  const [solved, setSolved] = useState(false)
  const [phase, setPhase] = useState<ReviewPhase>("playing")
  const [hasMore, setHasMore] = useState(false)
  const [stats, setStats] = useState<ReviewStats>({
    reviewed: 0,
    promoted: 0,
    repeated: 0,
  })

  const item: ReviewQueueItem | null = session.items[index] ?? null
  const challenge: Challenge | null = item
    ? buildReviewChallenge(item, session.pool, speechAvailable)
    : null
  const profile: DifficultyProfile = profileFor(item?.level ?? 1)

  function answer(outcome: ChallengeOutcome) {
    if (!item || solved) {
      return
    }
    const passed = !outcome.hintUsed && !outcome.revealed
    recordReviewResult(item.key, passed)
    setStats((current) => ({
      reviewed: current.reviewed + 1,
      promoted: current.promoted + (passed ? 1 : 0),
      repeated: current.repeated + (passed ? 0 : 1),
    }))
    setSolved(true)
  }

  function goNext() {
    if (!solved) {
      return
    }
    if (index + 1 >= session.items.length) {
      setHasMore(buildReviewQueue(getProgressSnapshot(), Date.now()).length > 0)
      setPhase("complete")
      return
    }
    setIndex(index + 1)
    setSolved(false)
  }

  function restart() {
    store.reset()
    setIndex(0)
    setSolved(false)
    setHasMore(false)
    setPhase("playing")
    setStats({ reviewed: 0, promoted: 0, repeated: 0 })
  }

  return {
    phase,
    hasMore,
    index,
    total: session.items.length,
    item,
    challenge,
    profile,
    solved,
    stats,
    answer,
    goNext,
    restart,
  }
}
