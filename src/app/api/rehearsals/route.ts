import { NextResponse } from "next/server"

import {
  createRehearsal,
  parseCreateRehearsalInput,
  RehearsalActionError,
} from "@/features/rehearsal/server/rehearsal-actions.server"
import {
  rehearsalActionErrorResponse,
  rehearsalErrorResponse,
  rehearsalInternalErrorResponse,
} from "@/features/rehearsal/server/http"
import { getCurrentUser } from "@/shared/lib/supabase/server"

export async function POST(request: Request) {
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
      "Envía la situación y el objetivo en formato JSON.",
    )
  }

  const input = parseCreateRehearsalInput(body)
  if (!input) {
    return rehearsalErrorResponse(
      400,
      "invalid-request",
      "Describe la situación y el objetivo con un poco más de detalle.",
    )
  }

  try {
    const session = await createRehearsal(user.id, input)
    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    if (error instanceof RehearsalActionError) {
      return rehearsalActionErrorResponse(error)
    }

    return rehearsalInternalErrorResponse()
  }
}
