import { NextResponse } from "next/server"

import { getCurrentUser } from "@/shared/lib/supabase/server"
import { createVideoRepository } from "@/features/videos/server/video-repository.server"
import {
  videoErrorResponse,
  videoInternalErrorResponse,
} from "@/features/videos/server/http"

export async function GET() {
  let user
  try {
    user = await getCurrentUser()
  } catch {
    return videoInternalErrorResponse()
  }

  if (!user) {
    return videoErrorResponse(
      401,
      "unauthorized",
      "Inicia sesión para usar videos.",
    )
  }

  try {
    const repository = await createVideoRepository()
    const videos = await repository.list(user.id)
    return NextResponse.json({ videos })
  } catch {
    return videoInternalErrorResponse()
  }
}
