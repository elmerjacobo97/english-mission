import { NextResponse } from "next/server"

export function videoErrorResponse(
  status: number,
  code: string,
  message: string,
) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export function videoInternalErrorResponse() {
  return videoErrorResponse(
    500,
    "internal-error",
    "No pudimos completar la solicitud. Intenta de nuevo.",
  )
}
