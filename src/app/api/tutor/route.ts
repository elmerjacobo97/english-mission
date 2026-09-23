import { NextResponse } from "next/server"

import { askTutor, parseTutorRequest, TutorServiceError } from "@/features/tutor/server/tutor-service.server"
import { getTutorUsage, recordTutorResponse } from "@/features/tutor/server/tutor-usage.server"
import { getCurrentUser } from "@/shared/lib/supabase/server"

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export async function POST(request: Request) {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return errorResponse(500, "internal-error", "No pudimos completar la solicitud. Intenta de nuevo.")
  }

  if (!user) {
    return errorResponse(401, "unauthorized", "Inicia sesión para usar el tutor.")
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse(400, "invalid-request", "Envía una pregunta válida en formato JSON.")
  }

  const tutorRequest = parseTutorRequest(body)
  if (!tutorRequest) {
    return errorResponse(400, "invalid-request", "Revisa la pregunta, el historial y la misión.")
  }

  try {
    const usage = await getTutorUsage(user.id)
    if (usage.remaining <= 0) {
      return errorResponse(429, "daily-limit", "Alcanzaste el límite diario del tutor.")
    }

    const result = await askTutor(user.id, tutorRequest)
    if (!result.ok) {
      return errorResponse(
        result.retryable ? 503 : 502,
        "ai-unavailable",
        "Coco no pudo responder. Intenta de nuevo.",
      )
    }

    if (!(await recordTutorResponse())) {
      return errorResponse(429, "daily-limit", "Alcanzaste el límite diario del tutor.")
    }

    return NextResponse.json({ reply: result.value })
  } catch (error) {
    if (error instanceof TutorServiceError) {
      if (error.code === "unknown-mission") {
        return errorResponse(400, error.code, "No encontramos esa misión.")
      }
      if (error.code === "invalid-beat-index") {
        return errorResponse(400, error.code, "El paso activo no es válido.")
      }
      return errorResponse(409, error.code, "Selecciona tu ruta CEFR antes de usar el tutor.")
    }

    return errorResponse(500, "internal-error", "No pudimos completar la solicitud. Intenta de nuevo.")
  }
}
