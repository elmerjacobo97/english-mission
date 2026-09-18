"use client"

import { useState } from "react"
import type { ChoiceChallenge } from "@/shared/lib/game/types/beat"
import type { ChallengeOutcome } from "@/shared/lib/game/types/run"
import { buildReviewPool } from "@/shared/lib/review/review-queue"
import { recordRecharge } from "@/shared/lib/progress/progress-store"
import { canRecharge, rechargesUsed } from "@/shared/lib/progress/shop"
import { localDayKey } from "@/shared/lib/progress/streak"
import { useProgress } from "@/shared/hooks/use-progress"
import { buildShopChallenge, shopPayout } from "../utils/shop-exercise"

export type ShopPhase = "ready" | "playing" | "result"

export function useShopRun() {
  const { progress } = useProgress()
  const [phase, setPhase] = useState<ShopPhase>("ready")
  const [challenge, setChallenge] = useState<ChoiceChallenge | null>(null)
  const [payout, setPayout] = useState(0)

  const pool = buildReviewPool(progress)
  const day = localDayKey(new Date())
  const usedToday = rechargesUsed(progress.shop, day)
  const quotaLeft = canRecharge(progress.shop, day)

  function start() {
    const built = buildShopChallenge(pool)
    if (!built) {
      return
    }
    setChallenge(built)
    setPayout(0)
    setPhase("playing")
  }

  function answer(outcome: ChallengeOutcome) {
    const earned = shopPayout(outcome.wrongAttempts, outcome.hintUsed)
    if (earned > 0) {
      recordRecharge(earned)
    }
    setPayout(earned)
    setPhase("result")
  }

  return {
    phase,
    coins: progress.coins,
    usedToday,
    quotaLeft,
    hasWords: pool.length > 0,
    challenge,
    payout,
    start,
    answer,
  }
}
