"use client"

import { ArrowLeftIcon, ChatCircleDotsIcon } from "@phosphor-icons/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { PageHeader } from "@/shared/components/page-header"
import { useRehearsalSession } from "../hooks/use-rehearsal-session"
import type { RehearsalSession } from "../types"
import {
  genericRehearsalError,
  requestRehearsalSession,
  type RehearsalUiError,
} from "../utils/rehearsal-api"
import { RehearsalConversation } from "./rehearsal-conversation"
import { RehearsalFeedback } from "./rehearsal-feedback"
import { RehearsalTranscript } from "./rehearsal-transcript"
import { ScenarioReview } from "./scenario-review"

const TITLES: Record<RehearsalSession["status"], string> = {
  ready: "Revisa tu ensayo",
  in_progress: "Ensayo en curso",
  completed: "Resultado del ensayo",
}

export function RehearsalSessionPage({
  initialSession,
}: {
  initialSession: RehearsalSession
}) {
  const router = useRouter()
  const rehearsal = useRehearsalSession(initialSession)
  const { session, busy, error, pending } = rehearsal
  const [repeating, setRepeating] = useState(false)
  const [repeatError, setRepeatError] = useState<RehearsalUiError | null>(null)

  async function repeatRehearsal() {
    setRepeating(true)
    setRepeatError(null)

    const result = await requestRehearsalSession("/api/rehearsals", {
      sourceSessionId: session.id,
    })
    setRepeating(false)

    const nextSession = result.session
    if (!nextSession) {
      setRepeatError(result.error ?? genericRehearsalError)
      return
    }

    router.push(`/rehearsals/${nextSession.id}`)
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        icon={ChatCircleDotsIcon}
        title={TITLES[session.status]}
        description={session.situation}
        aside={
          <Link
            href="/rehearsals"
            aria-label="Volver a ensayos"
            className="ui-button ui-button-secondary shrink-0 px-3"
          >
            <ArrowLeftIcon weight="bold" size={16} aria-hidden />
            Ensayos
          </Link>
        }
      />

      {error && (
        <section
          role="alert"
          data-error-code={error.code}
          className="rounded-2xl border-2 border-error/20 bg-error-soft px-4 py-3"
        >
          <p className="text-sm font-semibold text-error">{error.message}</p>
        </section>
      )}

      {repeatError && (
        <section
          role="alert"
          data-error-code={repeatError.code}
          className="rounded-2xl border-2 border-error/20 bg-error-soft px-4 py-3"
        >
          <p className="text-sm font-semibold text-error">{repeatError.message}</p>
        </section>
      )}

      {session.status === "ready" && (
        <ScenarioReview
          session={session}
          starting={busy === "start"}
          onStart={() => void rehearsal.start()}
        />
      )}

      {session.status === "in_progress" && (
        <RehearsalConversation
          session={session}
          pending={pending}
          busy={busy}
          onReply={rehearsal.reply}
          onRetry={() => void rehearsal.retry()}
          onHint={() => void rehearsal.hint()}
          onFinish={() => void rehearsal.finish()}
        />
      )}

      {session.status === "completed" && (
        <>
          <RehearsalFeedback
            session={session}
            repeating={repeating}
            onRepeat={() => void repeatRehearsal()}
          />
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xs font-bold uppercase tracking-wide text-muted">
              Conversación
            </h2>
            <RehearsalTranscript
              messages={session.messages}
              characterRole={session.characterRole}
            />
          </section>
        </>
      )}
    </main>
  )
}
