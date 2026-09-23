"use client"

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenTextIcon,
  ChatCircleDotsIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { PageHeader } from "@/shared/components/page-header"
import {
  getSpeechSupportServerSnapshot,
  getSpeechSupportSnapshot,
  stopSpeaking,
  subscribeSpeechSupport,
} from "@/shared/lib/speech"
import { useMissionRun } from "../hooks/use-mission-run"
import type { Mission } from "@/shared/lib/game/types/mission"
import type { CharacterId } from "@/shared/lib/game/types/character"
import { ChoiceChallenge } from "@/shared/components/game/choice-challenge"
import { DialogueChallenge } from "@/shared/components/game/dialogue-challenge"
import { FillChallenge } from "@/shared/components/game/fill-challenge"
import { ListenChallenge } from "@/shared/components/game/listen-challenge"
import { MissionComplete } from "./mission-complete"
import { OrderChallenge } from "@/shared/components/game/order-challenge"
import { StoryBeat } from "@/shared/components/game/story-beat"
import { CharacterIntroduction } from "@/shared/components/game/character-introduction"
import { TypeChallenge } from "@/shared/components/game/type-challenge"
import { TutorPanel } from "./tutor-panel"

type MissionPlayerProps = {
  mission: Mission
}

export function MissionPlayer({ mission }: MissionPlayerProps) {
  const run = useMissionRun(mission)
  const beatRef = useRef<HTMLDivElement>(null)
  const previousIndex = useRef(run.index)
  const [introducedCharacters, setIntroducedCharacters] = useState<Set<CharacterId>>(
    () => new Set(),
  )
  const [tutorOpen, setTutorOpen] = useState(false)
  const speechAvailable = useSyncExternalStore(
    subscribeSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  )

  useEffect(() => stopSpeaking, [])

  useEffect(() => {
    if (previousIndex.current !== run.index) {
      beatRef.current?.focus()
      previousIndex.current = run.index
    }
  }, [run.index])

  function markCurrentCharacter() {
    const character = run.beat?.character
    if (!character) return
    setIntroducedCharacters((current) => {
      if (current.has(character)) {
        return current
      }
      const next = new Set(current)
      next.add(character)
      return next
    })
  }

  function goNext() {
    markCurrentCharacter()
    run.goNext()
  }

  function goBack() {
    markCurrentCharacter()
    run.goBack()
  }

  function restart() {
    setIntroducedCharacters(new Set())
    run.restart()
  }

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
    onContinue: goNext,
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-4 py-5">
      <PageHeader
        icon={BookOpenTextIcon}
        title={mission.title}
        description={mission.subtitle}
        aside={
          <Link href="/" className="ui-button ui-button-secondary shrink-0 px-3">
            <ArrowLeftIcon weight="bold" size={16} aria-hidden />
            Volver al mapa
          </Link>
        }
      />

      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="Progreso de la misión"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full border-2 border-ink/10 bg-surface"
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {run.phase !== "complete" && beat && (
          <button
            type="button"
            aria-label="Pregúntale a Coco"
            aria-haspopup="dialog"
            aria-expanded={tutorOpen}
            onClick={() => setTutorOpen(true)}
            className="ui-button ui-button-quiet shrink-0 px-3"
          >
            <ChatCircleDotsIcon size={18} weight="fill" aria-hidden />
            Coco
          </button>
        )}
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
          onRestart={restart}
        />
        ) : beat ? (
        <>
          {tutorOpen && (
            <TutorPanel
              missionSlug={mission.slug}
              onClose={() => setTutorOpen(false)}
            />
          )}
          <div
            key={run.index}
            ref={beatRef}
            role="group"
            aria-label={`Paso ${run.index + 1} de ${run.total}`}
            tabIndex={-1}
            className="animate-rise flex flex-col gap-4"
          >
            {beat.character && !introducedCharacters.has(beat.character) && (
              <CharacterIntroduction character={beat.character} mood={beat.mood} />
            )}
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
              onClick={goBack}
              disabled={run.index === 0}
              className="ui-button ui-button-secondary justify-self-start px-3.5"
            >
              <ArrowLeftIcon weight="bold" size={16} aria-hidden />
              Anterior
            </button>
            <span className="justify-self-center font-display text-xs font-semibold text-muted">
              Paso {run.index + 1} de {run.total}
            </span>
            {canContinue ? (
              <button
                type="button"
                onClick={goNext}
                className="ui-button ui-button-primary animate-pop justify-self-end"
              >
                Continuar
                <ArrowRightIcon weight="bold" size={16} aria-hidden />
              </button>
            ) : canSubmit ? (
              <button
                type="submit"
                form="challenge-form"
                className="ui-button ui-button-primary justify-self-end"
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
