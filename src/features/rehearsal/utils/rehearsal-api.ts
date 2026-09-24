import { parseRehearsalSession, type RehearsalSession } from "../types"

export type RehearsalUiError = {
  code: string
  message: string
}

export const genericRehearsalError: RehearsalUiError = {
  code: "request-failed",
  message: "No pudimos completar la solicitud. Intenta de nuevo.",
}

export function isRehearsalRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export async function readRehearsalResponse(
  response: Response,
): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export function rehearsalResponseError(
  payload: unknown,
  fallback: RehearsalUiError = genericRehearsalError,
): RehearsalUiError {
  if (!isRehearsalRecord(payload) || !isRehearsalRecord(payload.error)) {
    return fallback
  }

  return {
    code:
      typeof payload.error.code === "string" ? payload.error.code : fallback.code,
    message:
      typeof payload.error.message === "string"
        ? payload.error.message
        : fallback.message,
  }
}

export type RehearsalRequestResult = {
  session: RehearsalSession | null
  error: RehearsalUiError | null
}

export async function requestRehearsalSession(
  url: string,
  body: Record<string, unknown>,
): Promise<RehearsalRequestResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const payload = await readRehearsalResponse(response)
    const session = parseRehearsalSession(
      isRehearsalRecord(payload) ? payload.session : null,
    )

    if (!response.ok) {
      return { session, error: rehearsalResponseError(payload) }
    }

    return session
      ? { session, error: null }
      : { session: null, error: genericRehearsalError }
  } catch {
    return { session: null, error: genericRehearsalError }
  }
}
