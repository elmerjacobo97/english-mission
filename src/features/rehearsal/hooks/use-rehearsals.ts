"use client"

import { useState } from "react"

import type { RehearsalSession } from "../types"
import {
  genericRehearsalError,
  readRehearsalResponse,
  rehearsalResponseError,
  type RehearsalUiError,
} from "../utils/rehearsal-api"

export function useRehearsals(initialSessions: RehearsalSession[]) {
  const [sessions, setSessions] = useState(initialSessions)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<RehearsalUiError | null>(null)

  function add(session: RehearsalSession) {
    setSessions((current) => [
      session,
      ...current.filter((item) => item.id !== session.id),
    ])
  }

  async function remove(id: string): Promise<boolean> {
    setDeletingId(id)
    setError(null)

    try {
      const response = await fetch(
        `/api/rehearsals/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      )
      const payload = await readRehearsalResponse(response)

      if (!response.ok) {
        setError(rehearsalResponseError(payload))
        return false
      }

      setSessions((current) => current.filter((item) => item.id !== id))
      return true
    } catch {
      setError(genericRehearsalError)
      return false
    } finally {
      setDeletingId(null)
    }
  }

  return {
    sessions,
    deletingId,
    error,
    add,
    remove,
    clearError: () => setError(null),
  }
}
