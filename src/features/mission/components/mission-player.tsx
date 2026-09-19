"use client"

import { ArrowLeft, ArrowRight } from "@phosphor-icons/react"
import { useEffect, useSyncExternalStore } from "react"
import {
  getSpeechSupportServerSnapshot,
  getSpeechSupportSnapshot,
  stopSpeaking,
  subscribeSpeechSupport,
} from "@/shared/lib/speech"
import { useMissionRun } from "../hooks/use-mission-run"
import type { Mission } from "@/shared/lib/game/types/mission"
import { ChoiceChallenge } from "@/shared/components/game/choice-challenge"
import { DialogueChallenge } from "@/shared/components/game/dialogue-challenge"
import { FillChallenge } from "@/shared/components/game/fill-challenge"
import { ListenChallenge } from "@/shared/components/game/listen-challenge"
import { MissionComplete } from "./mission-complete"
import { OrderChallenge } from "@/shared/components/game/order-challenge"
import { StoryBeat } from "@/shared/components/game/story-beat"
import { TypeChallenge } from "@/shared/components/game/type-challenge"

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
  const solvedOutcome = run.outcomes[run.index]
  const canContinue = !beat || beat.kind === "story" || Boolean(solvedOutcome)
  const canSubmit =
    !solvedOutcome &&
    (beat?.kind === "order" || beat?.kind === "type" || beat?.kind === "fill")

  const shared = {
    coins: run.coins,
    rewardsEnabled: run.rewardsEnabled,
    profile: run.profile,
    solvedOutcome,
    onSpendCoins: run.spendCoins,
    onSolved: run.reportSolved,
    onContinue: run.goNext,
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-4 py-5">
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
        <>
          <div key={run.index} className="animate-rise">
            {beat.kind === "story" && (
              <StoryBeat
                beat={beat}
                speechAvailable={speechAvailable}
                englishVisible={run.profile.englishVisible}
              />
            )}
            {beat.kind === "choice" && (
              <ChoiceChallenge beat={beat} {...shared} />
            )}
            {beat.kind === "order" && (
              <OrderChallenge beat={beat} {...shared} />
            )}
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

          <div className="grid grid-cols-3 items-center gap-2">
            <button
              type="button"
              onClick={run.goBack}
              disabled={run.index === 0}
              className="flex min-h-11 items-center gap-1.5 justify-self-start rounded-2xl border-2 border-ink/10 bg-surface px-3.5 font-display text-sm font-semibold text-muted shadow-card transition hover:text-ink disabled:opacity-40"
            >
              <ArrowLeft weight="bold" size={16} aria-hidden />
              Anterior
            </button>
            <span className="justify-self-center font-display text-xs font-semibold text-muted">
              Paso {run.index + 1} de {run.total}
            </span>
            {canContinue ? (
              <button
                type="button"
                onClick={run.goNext}
                className="animate-pop flex min-h-11 items-center gap-1.5 justify-self-end rounded-2xl bg-accent-strong px-4 font-display text-sm font-semibold text-white shadow-pop transition active:translate-y-0.5"
              >
                Continuar
                <ArrowRight weight="bold" size={16} aria-hidden />
              </button>
            ) : canSubmit ? (
              <button
                type="submit"
                form="challenge-form"
                className="flex min-h-11 items-center gap-1.5 justify-self-end rounded-2xl bg-accent-strong px-4 font-display text-sm font-semibold text-white shadow-pop transition active:translate-y-0.5"
              >
                Comprobar
              </button>
            ) : (
              <span />
            )}
          </div>
        </>
      ) : null}
    </main>
  )
}
