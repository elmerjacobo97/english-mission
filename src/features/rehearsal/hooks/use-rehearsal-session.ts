"use client"

import { useState } from "react"

import {
  countUserReplies,
  hasPendingReply,
  MAX_USER_REPLIES,
  type RehearsalSession,
} from "../types"
import {
  requestRehearsalSession,
  type RehearsalUiError,
} from "../utils/rehearsal-api"

export type RehearsalBusyAction = "start" | "reply" | "retry" | "hint" | "finish"

export function useRehearsalSession(initialSession: RehearsalSession) {
  const [session, setSession] = useState(initialSession)
  const [busy, setBusy] = useState<RehearsalBusyAction | null>(null)
  const [error, setError] = useState<RehearsalUiError | null>(null)

  async function run(
    action: RehearsalBusyAction,
    body: Record<string, unknown>,
  ): Promise<RehearsalSession | null> {
    setBusy(action)
    setError(null)

    try {
      const result = await requestRehearsalSession(
        `/api/rehearsals/${encodeURIComponent(session.id)}`,
        body,
      )

      if (result.session) {
        setSession(result.session)
      }
      if (result.error) {
        setError(result.error)
      }

      return result.session
    } finally {
      setBusy(null)
    }
  }

  return {
    session,
    busy,
    error,
    replies: countUserReplies(session.messages),
    maxReplies: MAX_USER_REPLIES,
    pending: hasPendingReply(session),
    start: () => run("start", { action: "start" }),
    reply: (content: string) => run("reply", { action: "reply", content }),
    retry: () => run("retry", { action: "retry" }),
    hint: () => run("hint", { action: "hint" }),
    finish: () => run("finish", { action: "finish" }),
    clearError: () => setError(null),
  }
}
