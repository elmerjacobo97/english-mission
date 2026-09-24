"use client"

import { TrashIcon, XIcon } from "@phosphor-icons/react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import type { RehearsalSession } from "../types"
import { OUTCOME_LABELS } from "./rehearsal-feedback"

const STATUS_LABELS: Record<RehearsalSession["status"], string> = {
  ready: "Listo para comenzar",
  in_progress: "En curso",
  completed: "Completado",
}

const STATUS_STYLES: Record<RehearsalSession["status"], string> = {
  ready: "border-accent/30 bg-accent/15 text-ink",
  in_progress: "border-teal/30 bg-teal-soft text-teal-strong",
  completed: "border-ink/10 bg-surface text-muted",
}

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
]

function formatActivityDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

function statusLabel(session: RehearsalSession): string {
  if (session.status === "completed" && session.feedback) {
    return OUTCOME_LABELS[session.feedback.outcome]
  }

  return STATUS_LABELS[session.status]
}

export function RehearsalHistory({
  sessions,
  deletingId,
  onDelete,
}: {
  sessions: RehearsalSession[]
  deletingId: string | null
  onDelete: (id: string) => Promise<boolean>
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const cancelConfirmationRef = useRef<HTMLButtonElement>(null)
  const deleteTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (confirmingId) {
      cancelConfirmationRef.current?.focus()
    }
  }, [confirmingId])

  function cancelDelete() {
    const id = confirmingId
    setConfirmingId(null)
    if (id) {
      window.requestAnimationFrame(() => deleteTriggerRefs.current[id]?.focus())
    }
  }

  async function confirmDelete(id: string) {
    if (await onDelete(id)) {
      setConfirmingId(null)
      window.requestAnimationFrame(() => headingRef.current?.focus())
    }
  }

  return (
    <section aria-labelledby="rehearsal-history-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1 px-1">
        <h2
          ref={headingRef}
          id="rehearsal-history-title"
          tabIndex={-1}
          className="font-display text-lg font-bold outline-none"
        >
          Tus ensayos
        </h2>
        <p className="text-sm font-semibold text-muted">
          Retoma un ensayo pendiente o consulta los resultados anteriores.
        </p>
      </header>

      {sessions.length === 0 ? (
        <section className="ui-card-empty flex flex-col items-center gap-3 p-6 text-center">
          <p className="font-display font-semibold">Todavía no tienes ensayos</p>
          <p className="max-w-sm text-sm font-semibold text-muted">
            Describe una situación arriba para crear tu primer ensayo.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((session) => {
            const isDeleting = session.id === deletingId
            const isConfirming = session.id === confirmingId

            return (
              <li
                key={session.id}
                className="ui-card-interactive border-ink/10 p-3 shadow-card sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <Link
                    href={`/rehearsals/${session.id}`}
                    aria-label={`Abrir ensayo: ${session.situation}`}
                    className="flex min-w-0 flex-1 flex-col gap-1.5"
                  >
                    <span
                      className={`self-start rounded-full border-2 px-2.5 py-0.5 font-display text-xs font-bold ${STATUS_STYLES[session.status]}`}
                    >
                      {statusLabel(session)}
                    </span>
                    <span className="line-clamp-2 font-display text-base font-bold leading-tight">
                      {session.situation}
                    </span>
                    <span className="line-clamp-2 text-sm font-semibold text-muted">
                      {session.objective}
                    </span>
                    <span className="text-xs font-semibold text-muted">
                      {formatActivityDate(session.updatedAt)} ·{" "}
                      {session.characterRole}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(session.id)}
                    ref={(element) => {
                      deleteTriggerRefs.current[session.id] = element
                    }}
                    disabled={isDeleting || isConfirming}
                    aria-label={`Eliminar ensayo: ${session.situation}`}
                    className="ui-icon-button ui-icon-button-danger"
                  >
                    <TrashIcon weight="bold" size={18} aria-hidden />
                  </button>
                </div>

                {isConfirming && (
                  <div
                    role="alertdialog"
                    aria-modal="false"
                    aria-labelledby={`rehearsal-delete-title-${session.id}`}
                    aria-label={`Confirmar eliminación de ${session.situation}`}
                    className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-error-soft px-3 py-2"
                  >
                    <span
                      id={`rehearsal-delete-title-${session.id}`}
                      className="text-sm font-semibold text-error"
                    >
                      ¿Eliminar este ensayo?
                    </span>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        ref={cancelConfirmationRef}
                        onClick={cancelDelete}
                        className="ui-button ui-button-secondary px-3"
                      >
                        <XIcon size={16} aria-hidden />
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => void confirmDelete(session.id)}
                        disabled={isDeleting}
                        className="ui-button ui-button-danger px-3"
                      >
                        <TrashIcon size={16} aria-hidden />
                        {isDeleting ? "Eliminando…" : "Eliminar"}
                      </button>
                    </span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
