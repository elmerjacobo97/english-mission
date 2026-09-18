"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getProgressSnapshot } from "@/lib/progress/progress-store"
import { useProgress } from "@/lib/progress/use-progress"
import type { Beat } from "../types/beat"
import type { Mission } from "../types/mission"

export type MissionPhase = "playing" | "complete"

export function useMissionRun(mission: Mission) {
  const { progress, addCoins, finishMission, spendCoins } = useProgress()
  const [rewardsEnabled, setRewardsEnabled] = useState(
    () => !getProgressSnapshot().completed.includes(mission.slug),
  )
  const [index, setIndex] = useState(0)
  const [earned, setEarned] = useState(0)
  const [phase, setPhase] = useState<MissionPhase>("playing")
  const savedRef = useRef(false)

  const total = mission.beats.length
  const beat: Beat | undefined = mission.beats[index]

  useEffect(() => {
    if (phase !== "complete" || savedRef.current) {
      return
    }
    savedRef.current = true
    finishMission(mission.slug, mission.bonusCoins)
  }, [phase, mission, finishMission])

  const goNext = useCallback(() => {
    if (index >= total - 1) {
      setPhase("complete")
      return
    }
    setIndex(index + 1)
  }, [index, total])

  const reportSolved = useCallback(
    (reward: number) => {
      setEarned((current) => current + reward)
      if (rewardsEnabled) {
        addCoins(reward)
      }
    },
    [addCoins, rewardsEnabled],
  )

  const restart = useCallback(() => {
    savedRef.current = false
    setIndex(0)
    setEarned(0)
    setPhase("playing")
    setRewardsEnabled(
      !getProgressSnapshot().completed.includes(mission.slug),
    )
  }, [mission.slug])

  return {
    beat,
    index,
    total,
    phase,
    earned,
    isReplay: !rewardsEnabled,
    rewardsEnabled,
    coins: progress.coins,
    goNext,
    reportSolved,
    spendCoins,
    restart,
  }
}
