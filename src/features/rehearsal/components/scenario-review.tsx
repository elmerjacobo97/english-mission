"use client"

import { ChatCircleDotsIcon, PlayIcon } from "@phosphor-icons/react"

import type { RehearsalSession } from "../types"

export function ScenarioReview({
  session,
  starting,
  onStart,
}: {
  session: RehearsalSession
  starting: boolean
  onStart: () => void
}) {
  const opening = session.messages.find(
    (message) => message.kind === "character_reply",
  )

  return (
    <section
      aria-labelledby="scenario-title"
      className="ui-card flex flex-col gap-4"
    >
      <h2 id="scenario-title" className="font-display text-xl font-bold">
        Antes de comenzar
      </h2>

      <dl className="flex flex-col gap-3 text-sm">
        <div className="rounded-2xl bg-surface p-3">
          <dt className="font-display text-xs font-bold uppercase tracking-wide text-muted">
            Situación
          </dt>
          <dd className="mt-1 font-semibold leading-relaxed">
            {session.situation}
          </dd>
        </div>
        <div className="rounded-2xl bg-surface p-3">
          <dt className="font-display text-xs font-bold uppercase tracking-wide text-muted">
            Coco interpretará
          </dt>
          <dd className="mt-1 font-semibold leading-relaxed">
            {session.characterRole}
          </dd>
        </div>
        <div className="rounded-2xl bg-surface p-3">
          <dt className="font-display text-xs font-bold uppercase tracking-wide text-muted">
            Tu objetivo
          </dt>
          <dd className="mt-1 font-semibold leading-relaxed">
            {session.objective}
          </dd>
        </div>
      </dl>

      {opening && (
        <p className="rounded-2xl border-2 border-teal/20 bg-teal-soft p-3 text-sm font-semibold leading-relaxed">
          <span className="font-display font-bold">Coco abrirá la conversación: </span>
          “{opening.content}”
        </p>
      )}

      <p className="flex items-start gap-2 text-xs font-semibold text-muted">
        <ChatCircleDotsIcon
          weight="fill"
          size={16}
          className="mt-0.5 shrink-0 text-accent-strong"
          aria-hidden
        />
        Durante el ensayo Coco mantiene su papel. Las correcciones llegan al
        final.
      </p>

      <button
        type="button"
        onClick={onStart}
        disabled={starting}
        className="ui-button ui-button-primary self-start"
      >
        <PlayIcon weight="fill" size={16} aria-hidden />
        {starting ? "Comenzando…" : "Comenzar ensayo"}
      </button>
    </section>
  )
}
