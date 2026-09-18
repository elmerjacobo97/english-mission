"use client"

import { ArrowLeft, Coins } from "@phosphor-icons/react"
import Link from "next/link"
import { useEffect, useSyncExternalStore } from "react"
import {
  getSpeechSupportServerSnapshot,
  getSpeechSupportSnapshot,
  stopSpeaking,
  subscribeSpeechSupport,
} from "@/lib/speech"
import { useMissionRun } from "../hooks/use-mission-run"
import type { Mission } from "../types/mission"
import { ChoiceChallenge } from "./choice-challenge"
import { DialogueChallenge } from "./dialogue-challenge"
import { FillChallenge } from "./fill-challenge"
import { ListenChallenge } from "./listen-challenge"
import { MissionComplete } from "./mission-complete"
import { OrderChallenge } from "./order-challenge"
import { StoryBeat } from "./story-beat"
import { TypeChallenge } from "./type-challenge"

type MissionPlayerProps = {
  mission: Mission
}

export function MissionPlayer({ mission }: MissionPlayerProps) {
  const run = useMissionRun(mission)
  const speechAvailable = useSyncExternalStore(
    subscribeSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  )

  useEffect(() => stopSpeaking, [])

  const beat = run.beat
  const progressPercent = Math.round(((run.index + 1) / run.total) * 100)

  const shared = {
    coins: run.coins,
    rewardsEnabled: run.rewardsEnabled,
    profile: run.profile,
    onSpendCoins: run.spendCoins,
    onSolved: run.reportSolved,
    onContinue: run.goNext,
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-5">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="Volver al mapa"
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink/10 bg-surface shadow-card"
        >
          <ArrowLeft weight="bold" size={20} aria-hidden />
        </Link>
        <p className="flex items-center gap-1.5 truncate font-display text-sm font-semibold text-muted">
          <span aria-hidden>{mission.emoji}</span>
          {mission.title}
        </p>
        <span
          key={run.coins}
          className="animate-pop flex items-center gap-1.5 rounded-full border-2 border-ink/10 bg-surface px-3 py-2 font-display text-sm font-semibold shadow-card"
        >
          <Coins
            weight="duotone"
            size={18}
            className="text-accent-strong"
            aria-hidden
          />
          {run.coins}
        </span>
      </header>

      <div
        role="progressbar"
        aria-label="Progreso de la misión"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 w-full overflow-hidden rounded-full border-2 border-ink/10 bg-surface"
      >
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {run.phase === "complete" ? (
        <MissionComplete
          mission={mission}
          stars={run.stars}
          earned={run.earned}
          completionBonus={run.completionBonus}
          threeStarBonus={run.threeStarBonus}
          totalPaid={run.totalPaid}
          isReplay={run.isReplay}
          onRestart={run.restart}
        />
      ) : beat ? (
        <div key={run.index} className="animate-rise">
          {beat.kind === "story" && (
            <StoryBeat
              beat={beat}
              speechAvailable={speechAvailable}
              englishVisible={run.profile.englishVisible}
              onContinue={run.goNext}
            />
          )}
          {beat.kind === "choice" && <ChoiceChallenge beat={beat} {...shared} />}
          {beat.kind === "order" && <OrderChallenge beat={beat} {...shared} />}
          {beat.kind === "type" && <TypeChallenge beat={beat} {...shared} />}
          {beat.kind === "fill" && <FillChallenge beat={beat} {...shared} />}
          {beat.kind === "listen" && (
            <ListenChallenge
              beat={beat}
              speechAvailable={speechAvailable}
              {...shared}
            />
          )}
          {beat.kind === "dialogue" && (
            <DialogueChallenge
              beat={beat}
              speechAvailable={speechAvailable}
              {...shared}
            />
          )}
        </div>
      ) : null}
    </main>
  )
}
