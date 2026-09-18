"use client"

import { useEffect, useRef, useState } from "react"
import {
  getMissionProgress,
  recordMissionResult,
} from "@/lib/progress/progress-store"
import { useProgress } from "@/lib/progress/use-progress"
import type { Beat } from "../types/beat"
import type { Mission } from "../types/mission"
import type { ChallengeOutcome, MissionRunStats } from "../types/run"
import { profileFor } from "../utils/difficulty"
import { missionPayout, starsForRun } from "../utils/rewards"

export type MissionPhase = "playing" | "complete"

const EMPTY_STATS: MissionRunStats = {
  wrongAttempts: 0,
  hintsUsed: 0,
  reveals: 0,
}

export function useMissionRun(mission: Mission) {
  const { progress, addCoins, spendCoins } = useProgress()
  const profile = profileFor(mission.level)
  const [rewardsEnabled, setRewardsEnabled] = useState(
    () => !getMissionProgress(mission.slug).completed,
  )
  const [previousStars, setPreviousStars] = useState(
    () => getMissionProgress(mission.slug).stars,
  )
  const [index, setIndex] = useState(0)
  const [earned, setEarned] = useState(0)
  const [stats, setStats] = useState<MissionRunStats>(EMPTY_STATS)
  const [phase, setPhase] = useState<MissionPhase>("playing")
  const savedRef = useRef(false)

  const total = mission.beats.length
  const beat: Beat | undefined = mission.beats[index]

  const stars = starsForRun(stats)
  const completionBonus = rewardsEnabled ? profile.bonusCoins : 0
  const payout = missionPayout({
    stars,
    earned,
    bonusCoins: profile.bonusCoins,
    firstCompletion: rewardsEnabled,
    previousStars,
  })

  useEffect(() => {
    if (phase !== "complete" || savedRef.current) {
      return
    }
    savedRef.current = true
    recordMissionResult(mission.slug, {
      stars,
      payout: payout.payout,
      bestCoins: payout.bestCoins,
    })
  }, [phase, stars, payout.payout, payout.bestCoins, mission.slug])

  function goNext() {
    if (index >= total - 1) {
      setPhase("complete")
      return
    }
    setIndex(index + 1)
  }

  function reportSolved(result: ChallengeOutcome) {
    setEarned((current) =>
      rewardsEnabled ? current + result.reward : current,
    )
    setStats((current) => ({
      wrongAttempts: current.wrongAttempts + result.wrongAttempts,
      hintsUsed: current.hintsUsed + (result.hintUsed ? 1 : 0),
      reveals: current.reveals + (result.revealed ? 1 : 0),
    }))
    if (rewardsEnabled) {
      addCoins(result.reward)
    }
  }

  function restart() {
    savedRef.current = false
    setIndex(0)
    setEarned(0)
    setStats(EMPTY_STATS)
    setPhase("playing")
    setRewardsEnabled(!getMissionProgress(mission.slug).completed)
    setPreviousStars(getMissionProgress(mission.slug).stars)
  }

  return {
    beat,
    index,
    total,
    phase,
    profile,
    stars,
    earned,
    completionBonus,
    threeStarBonus: payout.payout - completionBonus,
    totalPaid: earned + payout.payout,
    isReplay: !rewardsEnabled,
    rewardsEnabled,
    coins: progress.coins,
    goNext,
    reportSolved,
    spendCoins,
    restart,
  }
}
