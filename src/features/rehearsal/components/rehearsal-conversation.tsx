"use client"

import {
  ArrowCounterClockwiseIcon,
  LightbulbIcon,
  PaperPlaneTiltIcon,
  StopCircleIcon,
} from "@phosphor-icons/react"
import { useState, type FormEvent } from "react"

import {
  countUserReplies,
  MAX_USER_REPLIES,
  type RehearsalMessage,
  type RehearsalSession,
} from "../types"
import type { RehearsalBusyAction } from "../hooks/use-rehearsal-session"
import { RehearsalTranscript } from "./rehearsal-transcript"

function countRepliesWith(messages: RehearsalMessage[], content: string): number {
  return messages.filter(
    (message) => message.kind === "user_reply" && message.content === content,
  ).length
}

export function RehearsalConversation({
  session,
  pending,
  busy,
  onReply,
  onRetry,
  onHint,
  onFinish,
}: {
  session: RehearsalSession
  pending: boolean
  busy: RehearsalBusyAction | null
  onReply: (content: string) => Promise<RehearsalSession | null>
  onRetry: () => void
  onHint: () => void
  onFinish: () => void
}) {
  const [draft, setDraft] = useState("")
  const replies = countUserReplies(session.messages)
  const sending = busy === "reply"

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || busy !== null) {
      return
    }

    const savedBefore = countRepliesWith(session.messages, content)
    const updated = await onReply(content)
    if (updated && countRepliesWith(updated.messages, content) > savedBefore) {
      setDraft("")
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p aria-live="polite" className="font-display text-sm font-bold">
          Respuesta {replies} de {MAX_USER_REPLIES}
        </p>
        <span aria-hidden className="flex items-center gap-1">
          {Array.from({ length: MAX_USER_REPLIES }, (_, index) => (
            <span
              key={index}
              className={`size-2 rounded-full ${
                index < replies ? "bg-accent" : "bg-ink/15"
              }`}
            />
          ))}
        </span>
      </div>

      <RehearsalTranscript
        messages={session.messages}
        characterRole={session.characterRole}
      />

      {(sending || busy === "retry") && (
        <p
          role="status"
          className="motion-safe:animate-pulse self-start rounded-2xl bg-surface p-3 text-sm font-semibold text-muted"
        >
          Coco está respondiendo…
        </p>
      )}

      {pending ? (
        <div className="ui-card flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted">
            Coco todavía no respondió. Reintenta sin escribir otra respuesta.
          </p>
          <button
            type="button"
            onClick={onRetry}
            disabled={busy !== null}
            className="ui-button ui-button-secondary px-3"
          >
            <ArrowCounterClockwiseIcon weight="bold" size={16} aria-hidden />
            {busy === "retry" ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : (
        <form onSubmit={submitReply} className="flex flex-col gap-3">
          <label htmlFor="rehearsal-reply" className="sr-only">
            Tu respuesta en inglés
          </label>
          <textarea
            id="rehearsal-reply"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={1000}
            rows={3}
            disabled={sending}
            placeholder="Escribe tu respuesta en inglés…"
            className="ui-input resize-y"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-muted">
              {draft.length}/1000
            </span>
            <button
              type="submit"
              disabled={!draft.trim() || busy !== null}
              className="ui-button ui-button-primary"
            >
              {sending ? "Enviando…" : "Enviar respuesta"}
              <PaperPlaneTiltIcon weight="fill" size={16} aria-hidden />
            </button>
          </div>
          {replies === MAX_USER_REPLIES - 1 && (
            <p className="text-xs font-semibold text-muted">
              Esta es tu última respuesta: al enviarla, Coco evaluará tu ensayo.
            </p>
          )}
        </form>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onHint}
          disabled={busy !== null}
          className="ui-button ui-button-secondary"
        >
          <LightbulbIcon weight="fill" size={16} aria-hidden />
          {busy === "hint" ? "Buscando pista…" : "Dame una pista"}
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={busy !== null}
          className="ui-button ui-button-subtle"
        >
          <StopCircleIcon weight="fill" size={16} aria-hidden />
          {busy === "finish" ? "Evaluando…" : "Terminar ensayo"}
        </button>
      </div>
    </section>
  )
}
