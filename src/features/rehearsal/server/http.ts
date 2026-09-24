import "server-only"

import { NextResponse } from "next/server"

import type { RehearsalSession } from "../types"
import { RehearsalActionError } from "./rehearsal-actions.server"

export function rehearsalErrorResponse(
  status: number,
  code: string,
  message: string,
  session: RehearsalSession | null = null,
) {
  return NextResponse.json(
    { error: { code, message }, ...(session ? { session } : {}) },
    { status },
  )
}

export function rehearsalInternalErrorResponse() {
  return rehearsalErrorResponse(
    500,
    "internal-error",
    "No pudimos completar la solicitud. Intenta de nuevo.",
  )
}

export function rehearsalActionErrorResponse(error: RehearsalActionError) {
  const { code, session } = error

  switch (code) {
    case "course-band-required":
      return rehearsalErrorResponse(
        409,
        code,
        "Selecciona tu ruta CEFR antes de practicar un ensayo.",
      )
    case "not-found":
      return rehearsalErrorResponse(404, code, "No encontramos este ensayo.")
    case "invalid-status":
      return rehearsalErrorResponse(409, code, "Este ensayo ya no está en curso.")
    case "turn-limit":
      return rehearsalErrorResponse(
        409,
        code,
        "Ya usaste tus cinco respuestas en este ensayo.",
        session,
      )
    case "pending-generation":
      return rehearsalErrorResponse(
        409,
        code,
        "Coco todavía está respondiendo. Reintenta la respuesta pendiente.",
        session,
      )
    case "no-pending-generation":
      return rehearsalErrorResponse(
        409,
        code,
        "No hay ninguna respuesta pendiente por generar.",
        session,
      )
    case "conflict":
      return rehearsalErrorResponse(
        409,
        code,
        "Otro dispositivo actualizó este ensayo. Recuperamos la conversación más reciente.",
        session,
      )
    case "daily-limit":
      return rehearsalErrorResponse(
        429,
        code,
        "Alcanzaste el límite diario de 50 generaciones. Podrás continuar después del reinicio diario (UTC).",
        session,
      )
    case "ai-unavailable":
      return rehearsalErrorResponse(
        503,
        code,
        "Coco no pudo responder. Intenta de nuevo.",
        session,
      )
  }
}
