"use client"

import { CheckCircleIcon, LightbulbIcon, XCircleIcon } from "@phosphor-icons/react"
import type { ReactNode } from "react"
import type { GrammarNote as GrammarNoteData } from "@/shared/lib/game/types/beat"
import type { ChallengeFeedback } from "@/shared/lib/game/types/run"
import { CharacterAvatar } from "./character-avatar"
import { GrammarNote } from "./grammar-note"

type ChallengeFrameProps = {
  prompt: string
  wrongAttempts: number
  maxAttempts: number
  feedback: ChallengeFeedback | null
  hint: string | null
  hintCost: number
  coins: number
  freeHints?: boolean
  note?: GrammarNoteData
  onRequestHint: () => void
  onContinue?: () => void
  children: ReactNode
}

export function ChallengeFrame({
  prompt,
  wrongAttempts,
  maxAttempts,
  feedback,
  hint,
  hintCost,
  coins,
  freeHints = false,
  note,
  onRequestHint,
  onContinue,
  children,
}: ChallengeFrameProps) {
  const solved = Boolean(onContinue)
  const canAffordHint = freeHints || coins >= hintCost
  const attempts = Array.from({ length: maxAttempts }, (_, i) => i)

  return (
    <section className="ui-card flex flex-col gap-5 p-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <CharacterAvatar character="coco" size={34} />
          <span className="rounded-full bg-teal-soft px-3 py-1 font-display text-xs font-semibold uppercase tracking-widest text-teal-strong">
            Prueba
          </span>
        </div>
        <h2 className="font-display text-xl font-bold leading-snug">
          {prompt}
        </h2>
        <div
          className="flex items-center gap-1.5"
          role="img"
          aria-label={`Intentos fallidos: ${wrongAttempts} de ${maxAttempts}`}
        >
          {attempts.map((dot) => (
            <span
              key={dot}
              className={`h-2.5 w-8 rounded-full transition-colors ${
                dot < wrongAttempts ? "bg-error" : "bg-ink/10"
              }`}
            />
          ))}
        </div>
      </header>

      {children}

      {note && <GrammarNote note={note} />}

      {hint ? (
        <p className="animate-slide-in flex items-start gap-2 rounded-2xl border-2 border-accent/25 bg-paper px-4 py-3 text-sm font-semibold text-accent-deep">
          <LightbulbIcon
            weight="fill"
            size={18}
            className="mt-0.5 shrink-0"
            aria-hidden
          />
          {hint}
        </p>
      ) : (
        !solved && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={onRequestHint}
              disabled={!canAffordHint}
              className="ui-button ui-button-subtle self-start"
            >
              <LightbulbIcon weight="fill" size={18} aria-hidden />
              {freeHints ? "Pista gratis" : `Pista · ${hintCost} monedas`}
            </button>
            {!canAffordHint && (
              <span className="text-xs font-semibold text-muted">
                Te faltan monedas. Repite el audio o revisa el vocabulario
                gratis.
              </span>
            )}
          </div>
        )
      )}

      <div aria-live="polite" className="empty:hidden">
        {feedback && (
          <div
            className={`animate-slide-in flex flex-col gap-3 rounded-2xl border-2 px-4 py-3 ${
              feedback.tone === "success"
                ? "border-success/20 bg-success-soft text-success"
                : feedback.tone === "info"
                  ? "border-teal/25 bg-teal-soft text-teal-strong"
                  : "border-error/20 bg-error-soft text-error"
            }`}
          >
            <p className="flex items-start gap-2 font-display font-semibold">
              {feedback.tone === "success" ? (
                <CheckCircleIcon
                  weight="fill"
                  size={22}
                  className="mt-0.5 shrink-0"
                  aria-hidden
                />
              ) : feedback.tone === "info" ? (
                <LightbulbIcon
                  weight="fill"
                  size={22}
                  className="mt-0.5 shrink-0"
                  aria-hidden
                />
              ) : (
                <XCircleIcon
                  weight="fill"
                  size={22}
                  className="mt-0.5 shrink-0"
                  aria-hidden
                />
              )}
              {feedback.message}
            </p>
            {feedback.detail && (
              <p className="text-sm font-semibold">{feedback.detail}</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
