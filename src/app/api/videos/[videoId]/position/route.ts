import { NextResponse } from "next/server"

import { getCurrentUser } from "@/shared/lib/supabase/server"
import { createVideoRepository } from "@/features/videos/server/video-repository.server"
import {
  videoErrorResponse,
  videoInternalErrorResponse,
} from "@/features/videos/server/http"
import { isYouTubeVideoId } from "@/features/videos/utils/video"

type VideoPositionRouteContext = {
  params: Promise<{ videoId: string }>
}

function notFoundResponse() {
  return videoErrorResponse(
    404,
    "not-found",
    "No encontramos este video en tu biblioteca.",
  )
}

async function authenticatedUser() {
  try {
    return await getCurrentUser()
  } catch {
    return undefined
  }
}

export async function PATCH(
  request: Request,
  context: VideoPositionRouteContext,
) {
  const user = await authenticatedUser()
  if (user === undefined) {
    return videoInternalErrorResponse()
  }

  if (!user) {
    return videoErrorResponse(
      401,
      "unauthorized",
      "Inicia sesión para usar videos.",
    )
  }

  const { videoId } = await context.params
  if (!isYouTubeVideoId(videoId)) {
    return videoErrorResponse(400, "invalid-video-id", "Video no válido.")
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return videoErrorResponse(
      400,
      "invalid-request",
      "Indica una posición válida.",
    )
  }

  const positionMs =
    typeof body === "object" && body !== null && "positionMs" in body
      ? body.positionMs
      : undefined
  if (
    typeof positionMs !== "number" ||
    !Number.isSafeInteger(positionMs) ||
    positionMs < 0
  ) {
    return videoErrorResponse(
      400,
      "invalid-position",
      "Indica una posición válida.",
    )
  }

  const updatedAtValue =
    typeof body === "object" && body !== null && "updatedAt" in body
      ? body.updatedAt
      : undefined
  let clientUpdatedAt = new Date().toISOString()
  if (updatedAtValue !== undefined) {
    if (
      typeof updatedAtValue !== "string" ||
      Number.isNaN(Date.parse(updatedAtValue))
    ) {
      return videoErrorResponse(
        400,
        "invalid-position",
        "Indica una posición válida.",
      )
    }
    clientUpdatedAt = new Date(updatedAtValue).toISOString()
  }

  try {
    const repository = await createVideoRepository()
    const video = await repository.updatePosition(
      user.id,
      videoId,
      positionMs,
      clientUpdatedAt,
    )
    return video ? NextResponse.json({ video }) : notFoundResponse()
  } catch {
    return videoInternalErrorResponse()
  }
}
