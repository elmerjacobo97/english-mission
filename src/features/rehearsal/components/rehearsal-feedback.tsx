import { ArrowClockwiseIcon } from "@phosphor-icons/react"

import type { RehearsalOutcome, RehearsalSession } from "../types"

export const OUTCOME_LABELS: Record<RehearsalOutcome, string> = {
  achieved: "Objetivo logrado",
  partially_achieved: "Parcialmente logrado",
  not_achieved: "No logrado",
  insufficient_evidence: "Evidencia insuficiente",
}

const OUTCOME_STYLES: Record<RehearsalOutcome, string> = {
  achieved: "border-teal/30 bg-teal-soft text-teal-strong",
  partially_achieved: "border-accent/30 bg-accent/15 text-ink",
  not_achieved: "border-error/20 bg-error-soft text-error",
  insufficient_evidence: "border-ink/10 bg-surface text-muted",
}

export function RehearsalFeedback({
  session,
  repeating = false,
  onRepeat,
}: {
  session: RehearsalSession
  repeating?: boolean
  onRepeat?: () => void
}) {
  const feedback = session.feedback
  if (!feedback) {
    return null
  }

  return (
    <section
      aria-labelledby="rehearsal-feedback-title"
      className="ui-card flex flex-col gap-4"
    >
      <h2
        id="rehearsal-feedback-title"
        className="font-display text-xl font-bold"
      >
        Resultado del ensayo
      </h2>

      <p
        className={`self-start rounded-full border-2 px-3 py-1 font-display text-sm font-bold ${OUTCOME_STYLES[feedback.outcome]}`}
      >
        {OUTCOME_LABELS[feedback.outcome]}
      </p>

      <p className="text-sm font-semibold leading-relaxed">
        {feedback.explanation}
      </p>

      {feedback.corrections.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="font-display text-xs font-bold uppercase tracking-wide text-muted">
            Correcciones
          </h3>
          {feedback.corrections.map((correction, index) => (
            <article
              key={`${correction.original}-${index}`}
              className="rounded-2xl bg-surface p-3 text-sm"
            >
              <p className="text-muted line-through">{correction.original}</p>
              <p className="mt-1 font-semibold text-teal-strong">
                {correction.corrected}
              </p>
              <p className="mt-1 text-muted">{correction.reason}</p>
            </article>
          ))}
        </div>
      ) : (
        feedback.outcome !== "insufficient_evidence" && (
          <p className="rounded-2xl bg-teal-soft p-3 text-sm font-semibold text-teal-strong">
            Sin correcciones: tu inglés comunicó el objetivo.
          </p>
        )
      )}

      <p className="text-xs font-semibold text-muted">
        Este resultado evalúa el objetivo del ensayo; no certifica tu nivel
        CEFR.
      </p>

      {onRepeat && (
        <button
          type="button"
          onClick={onRepeat}
          disabled={repeating}
          className="ui-button ui-button-secondary self-start"
        >
          <ArrowClockwiseIcon weight="bold" size={16} aria-hidden />
          {repeating ? "Preparando variación…" : "Repetir con una variación"}
        </button>
      )}
    </section>
  )
}
