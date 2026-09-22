import { NextResponse } from "next/server"

import { getCurrentUser } from "@/shared/lib/supabase/server"
import { createVideoRepository } from "@/features/videos/server/video-repository.server"
import {
  videoErrorResponse,
  videoInternalErrorResponse,
} from "@/features/videos/server/http"
import { isYouTubeVideoId } from "@/features/videos/utils/video"

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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ videoId: string }> },
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

  try {
    const repository = await createVideoRepository()
    const video = await repository.delete(user.id, videoId)
    return video ? NextResponse.json({ video }) : notFoundResponse()
  } catch {
    return videoInternalErrorResponse()
  }
}
