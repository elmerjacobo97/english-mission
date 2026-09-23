"use client"

import { SpeakerHighIcon, XIcon } from "@phosphor-icons/react"
import { useState, useSyncExternalStore } from "react"
import { COURSE_BANDS } from "@/shared/lib/curriculum/course-bands"
import {
  PLACEMENT_QUESTIONS,
  scorePlacement,
} from "@/shared/lib/curriculum/placement"
import type { CourseBand } from "@/shared/lib/game/types/mission"
import {
  getSpeechSupportServerSnapshot,
  getSpeechSupportSnapshot,
  speak,
  subscribeSpeechSupport,
} from "@/shared/lib/speech"

type PlacementQuizProps = {
  onClose: () => void
  onSelect: (band: CourseBand) => void
  resultActionPrefix?: string
}

export function PlacementQuiz({
  onClose,
  onSelect,
  resultActionPrefix = "Empezar en",
}: PlacementQuizProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<ReturnType<typeof scorePlacement> | null>(null)
  const speechAvailable = useSyncExternalStore(
    subscribeSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  )
  const question = PLACEMENT_QUESTIONS[index]
  const selectedAnswer = question ? answers[question.id] : undefined
  const questionCount = PLACEMENT_QUESTIONS.length

  function chooseAnswer(optionIndex: number) {
    if (!question || selectedAnswer !== undefined) return
    const nextAnswers = { ...answers, [question.id]: optionIndex }
    setAnswers(nextAnswers)
  }

  function continueQuiz() {
    if (!question || selectedAnswer === undefined) return
    if (index === questionCount - 1) {
      setResult(scorePlacement(answers))
      return
    }
    setIndex((current) => current + 1)
  }

  return (
    <section
      aria-labelledby="placement-title"
      className="animate-rise flex flex-col gap-4 rounded-3xl border-2 border-accent-deep/20 bg-paper p-4 shadow-card sm:p-5"
    >
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="placement-title" className="font-display text-lg font-bold">
            Diagnóstico rápido
          </h2>
          <p className="mt-1 text-sm font-medium text-muted">
            9 preguntas, menos de 3 minutos. Es una recomendación: puedes elegir cualquier ruta.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar diagnóstico"
          className="ui-icon-button"
        >
          <XIcon size={18} weight="bold" aria-hidden />
        </button>
      </header>

      {result ? (
        <div className="flex flex-col gap-4" role="status">
          <div className="rounded-2xl border-2 border-teal/20 bg-teal-soft p-4">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-teal-strong">
              Tu recomendación
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-teal-strong">
              {COURSE_BANDS[result.recommended].title} · {COURSE_BANDS[result.recommended].range}
            </p>
            <p className="mt-1 text-sm font-medium text-teal-strong">
              {COURSE_BANDS[result.recommended].description}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(result.correctByBand).map(([band, correct]) => {
              const info = COURSE_BANDS[band as CourseBand]
              return (
                <div key={band} className="rounded-2xl border border-ink/10 bg-surface p-3 text-center">
                  <p className="font-display text-xs font-bold text-muted">{info.title}</p>
                  <p className="mt-1 font-display text-lg font-bold">{correct}/3</p>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => onSelect(result.recommended)}
            className="ui-button ui-button-primary-large font-bold"
          >
            {resultActionPrefix} {COURSE_BANDS[result.recommended].title}
          </button>
          <p className="text-center text-xs font-medium text-muted">
            Tu puntaje no se guarda; solo se conservará el nivel que elijas.
          </p>
        </div>
      ) : question ? (
        <div className="flex flex-col gap-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-muted">
              Pregunta {index + 1} de {questionCount}
            </span>
            <span className="rounded-full bg-accent px-3 py-1 font-display text-xs font-bold">
              {question.cefrLevel}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Avance del diagnóstico"
            aria-valuenow={index + 1}
            aria-valuemin={0}
            aria-valuemax={questionCount}
            className="h-2 overflow-hidden rounded-full bg-ink/10"
          >
            <div
              className="h-full rounded-full bg-accent-strong transition-all"
              style={{ width: `${((index + 1) / questionCount) * 100}%` }}
            />
          </div>
          <p className="font-display text-lg font-semibold">{question.prompt}</p>
          {question.audioText && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => speak(question.audioText ?? "")}
                disabled={!speechAvailable}
                className="ui-button ui-button-quiet"
              >
                <SpeakerHighIcon size={18} weight="fill" aria-hidden />
                Escuchar frase
              </button>
              {!speechAvailable && (
                <span className="text-xs font-medium text-muted">
                  Audio no disponible: {question.audioText}
                </span>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2">
            {question.options.map((option, optionIndex) => {
              const isSelected = selectedAnswer === optionIndex
              const isCorrect = optionIndex === question.correct
              const revealed = selectedAnswer !== undefined
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => chooseAnswer(optionIndex)}
                  disabled={revealed}
                  aria-pressed={isSelected}
                  className={`min-h-12 rounded-2xl border-2 px-4 py-3 text-left font-display text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong ${
                    revealed && isCorrect
                      ? "border-success/30 bg-success-soft text-success"
                      : isSelected
                        ? "border-error/30 bg-error-soft text-error"
                        : "border-ink/10 bg-surface hover:border-accent-deep/30"
                  }`}
                >
                  {option}
                </button>
              )
            })}
          </div>
          {selectedAnswer !== undefined && (
            <>
              <p className="rounded-2xl bg-surface px-4 py-3 text-sm font-medium text-muted">
                {selectedAnswer === question.correct ? "¡Correcto! " : "No exactamente. "}
                {question.explanation}
              </p>
              <button
                type="button"
                onClick={continueQuiz}
                className="ui-button ui-button-primary-large self-end font-bold"
              >
                {index === questionCount - 1 ? "Ver recomendación" : "Siguiente"}
              </button>
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}
