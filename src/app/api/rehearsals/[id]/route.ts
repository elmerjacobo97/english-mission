import { NextResponse } from "next/server"

import {
  finishRehearsal,
  parseRehearsalActionInput,
  RehearsalActionError,
  requestHint,
  retryGeneration,
  sendReply,
  startRehearsal,
} from "@/features/rehearsal/server/rehearsal-actions.server"
import {
  rehearsalActionErrorResponse,
  rehearsalErrorResponse,
  rehearsalInternalErrorResponse,
} from "@/features/rehearsal/server/http"
import { createRehearsalRepository } from "@/features/rehearsal/server/rehearsal-repository.server"
import { getCurrentUser } from "@/shared/lib/supabase/server"

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return rehearsalInternalErrorResponse()
  }

  if (!user) {
    return rehearsalErrorResponse(
      401,
      "unauthorized",
      "Inicia sesión para practicar un ensayo.",
    )
  }

  const { id } = await context.params

  try {
    const repository = await createRehearsalRepository()
    const removed = await repository.remove(user.id, id)

    return removed
      ? NextResponse.json({ removed: true })
      : rehearsalErrorResponse(404, "not-found", "No encontramos este ensayo.")
  } catch {
    return rehearsalInternalErrorResponse()
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return rehearsalInternalErrorResponse()
  }

  if (!user) {
    return rehearsalErrorResponse(
      401,
      "unauthorized",
      "Inicia sesión para practicar un ensayo.",
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return rehearsalErrorResponse(
      400,
      "invalid-request",
      "Envía una acción válida en formato JSON.",
    )
  }

  const input = parseRehearsalActionInput(body)
  if (!input) {
    return rehearsalErrorResponse(
      400,
      "invalid-request",
      "Revisa la acción y su contenido.",
    )
  }

  const { id } = await context.params

  try {
    switch (input.action) {
      case "start":
        return NextResponse.json({ session: await startRehearsal(user.id, id) })
      case "reply":
        return NextResponse.json({
          session: await sendReply(user.id, id, input.content),
        })
      case "retry":
        return NextResponse.json({ session: await retryGeneration(user.id, id) })
      case "hint":
        return NextResponse.json({ session: await requestHint(user.id, id) })
      case "finish":
        return NextResponse.json({ session: await finishRehearsal(user.id, id) })
    }
  } catch (error) {
    if (error instanceof RehearsalActionError) {
      return rehearsalActionErrorResponse(error)
    }

    return rehearsalInternalErrorResponse()
  }
}
