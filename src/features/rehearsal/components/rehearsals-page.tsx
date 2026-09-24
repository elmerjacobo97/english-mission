"use client"

import { ChatCircleDotsIcon, SparkleIcon } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"

import { PageHeader } from "@/shared/components/page-header"
import { useRehearsals } from "../hooks/use-rehearsals"
import type { RehearsalSession } from "../types"
import {
  genericRehearsalError,
  requestRehearsalSession,
  type RehearsalUiError,
} from "../utils/rehearsal-api"
import { RehearsalHistory } from "./rehearsal-history"
import { ScenarioReview } from "./scenario-review"

export function RehearsalsPage({
  initialSessions,
  initialError = null,
}: {
  initialSessions: RehearsalSession[]
  initialError?: string | null
}) {
  const router = useRouter()
  const rehearsals = useRehearsals(initialSessions)
  const [situation, setSituation] = useState("")
  const [objective, setObjective] = useState("")
  const [creating, setCreating] = useState(false)
  const [starting, setStarting] = useState(false)
  const [created, setCreated] = useState<RehearsalSession | null>(null)
  const [error, setError] = useState<RehearsalUiError | null>(null)

  async function createRehearsal() {
    setCreating(true)
    setError(null)

    const result = await requestRehearsalSession("/api/rehearsals", {
      situation: situation.trim(),
      objective: objective.trim(),
    })
    setCreating(false)

    const session = result.session
    if (!session) {
      setError(result.error ?? genericRehearsalError)
      return
    }

    setCreated(session)
    rehearsals.add(session)
  }

  async function startRehearsal() {
    if (!created) {
      return
    }

    setStarting(true)
    setError(null)

    const result = await requestRehearsalSession(
      `/api/rehearsals/${encodeURIComponent(created.id)}`,
      { action: "start" },
    )
    setStarting(false)

    const session = result.session
    if (!session) {
      setError(result.error ?? genericRehearsalError)
      return
    }

    router.push(`/rehearsals/${session.id}`)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!situation.trim() || !objective.trim() || creating) {
      return
    }

    void createRehearsal()
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        icon={ChatCircleDotsIcon}
        title="Ensayar"
        description="Practica una situación real en inglés con Coco como interlocutor."
      />

      {initialError && (
        <section
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-error/20 bg-error-soft px-4 py-3"
        >
          <p className="text-sm font-semibold text-error">{initialError}</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="ui-button ui-button-secondary px-3"
          >
            Reintentar
          </button>
        </section>
      )}

      {error && (
        <section
          role="alert"
          data-error-code={error.code}
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-error/20 bg-error-soft px-4 py-3"
        >
          <p className="text-sm font-semibold text-error">{error.message}</p>
          {!created && (
            <button
              type="button"
              onClick={() => void createRehearsal()}
              disabled={creating}
              className="ui-button ui-button-secondary px-3"
            >
              {creating ? "Preparando…" : "Reintentar"}
            </button>
          )}
        </section>
      )}

      {rehearsals.error && (
        <section
          role="alert"
          data-error-code={rehearsals.error.code}
          className="rounded-2xl border-2 border-error/20 bg-error-soft px-4 py-3"
        >
          <p className="text-sm font-semibold text-error">
            {rehearsals.error.message}
          </p>
        </section>
      )}

      {created ? (
        <>
          <ScenarioReview
            session={created}
            starting={starting}
            onStart={() => void startRehearsal()}
          />
          <button
            type="button"
            onClick={() => {
              setCreated(null)
              setError(null)
            }}
            disabled={starting}
            className="ui-button ui-button-quiet self-start"
          >
            Cambiar situación
          </button>
        </>
      ) : (
        <section className="relative overflow-hidden rounded-[2rem] border-2 border-ink/10 bg-ink p-5 text-paper shadow-pop sm:p-6">
          <div
            aria-hidden
            className="absolute -right-12 -top-16 size-44 rounded-full border-[18px] border-accent/40"
          />
          <div className="relative flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink">
                <SparkleIcon weight="fill" size={22} aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-xl font-bold">
                  Describe tu situación
                </h2>
                <p className="text-sm font-semibold text-paper/75">
                  Escribe en español o inglés. Coco preparará el escenario antes
                  de comenzar.
                </p>
              </div>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="rehearsal-situation"
                  className="font-display text-sm font-bold"
                >
                  ¿Qué situación quieres practicar?
                </label>
                <textarea
                  id="rehearsal-situation"
                  value={situation}
                  onChange={(event) => setSituation(event.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Pedir un café en una cafetería de Nueva York"
                  className="ui-input ui-input-inverse resize-y"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="rehearsal-objective"
                  className="font-display text-sm font-bold"
                >
                  ¿Qué quieres lograr?
                </label>
                <textarea
                  id="rehearsal-objective"
                  value={objective}
                  onChange={(event) => setObjective(event.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Pedir una bebida y confirmar el precio"
                  className="ui-input ui-input-inverse resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={!situation.trim() || !objective.trim() || creating}
                className="ui-button ui-button-primary-large font-bold"
              >
                {creating ? "Preparando escenario…" : "Preparar ensayo"}
              </button>

              <p className="text-xs font-semibold text-paper/60">
                Tu situación se envía al proveedor de IA configurado. Evita
                datos personales sensibles.
              </p>
            </form>
          </div>
        </section>
      )}

      <RehearsalHistory
        sessions={rehearsals.sessions}
        deletingId={rehearsals.deletingId}
        onDelete={rehearsals.remove}
      />
    </main>
  )
}
