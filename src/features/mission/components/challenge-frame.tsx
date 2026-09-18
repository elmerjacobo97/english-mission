"use client"

import {
  ArrowRight,
  CheckCircle,
  Lightbulb,
  XCircle,
} from "@phosphor-icons/react"
import type { ReactNode } from "react"

export type ChallengeFeedback = {
  tone: "error" | "success"
  message: string
  detail?: string
}

type ChallengeFrameProps = {
  prompt: string
  wrongAttempts: number
  feedback: ChallengeFeedback | null
  hint: string | null
  hintCost: number
  coins: number
  onRequestHint: () => void
  onContinue?: () => void
  children: ReactNode
}

export function ChallengeFrame({
  prompt,
  wrongAttempts,
  feedback,
  hint,
  hintCost,
  coins,
  onRequestHint,
  onContinue,
  children,
}: ChallengeFrameProps) {
  const solved = Boolean(onContinue)
  const canAffordHint = coins >= hintCost

  return (
    <section className="flex flex-col gap-5 rounded-3xl border-2 border-ink/10 bg-surface p-6 shadow-card">
      <header className="flex flex-col gap-3">
        <span className="self-start rounded-full bg-teal-soft px-3 py-1 font-display text-xs font-semibold uppercase tracking-widest text-teal-strong">
          Prueba
        </span>
        <h2 className="font-display text-xl font-bold leading-snug">
          {prompt}
        </h2>
        <div
          className="flex items-center gap-1.5"
          role="img"
          aria-label={`Intentos fallidos: ${wrongAttempts} de 3`}
        >
          {[0, 1, 2].map((dot) => (
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

      {hint ? (
        <p className="animate-slide-in flex items-start gap-2 rounded-2xl border-2 border-accent/25 bg-paper px-4 py-3 text-sm font-semibold text-accent-deep">
          <Lightbulb
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
              className="flex min-h-11 items-center gap-2 self-start rounded-2xl border-2 border-accent/30 bg-paper px-4 font-display text-sm font-semibold text-accent-deep transition hover:bg-accent/10 disabled:opacity-40"
            >
              <Lightbulb weight="fill" size={18} aria-hidden />
              Pista · {hintCost} monedas
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
                : "border-error/20 bg-error-soft text-error"
            }`}
          >
            <p className="flex items-start gap-2 font-display font-semibold">
              {feedback.tone === "success" ? (
                <CheckCircle
                  weight="fill"
                  size={22}
                  className="mt-0.5 shrink-0"
                  aria-hidden
                />
              ) : (
                <XCircle
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
            {onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="flex min-h-12 items-center gap-2 self-start rounded-2xl bg-accent-strong px-5 font-display font-semibold text-white shadow-pop transition active:translate-y-0.5"
              >
                Continuar
                <ArrowRight weight="bold" size={18} aria-hidden />
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
