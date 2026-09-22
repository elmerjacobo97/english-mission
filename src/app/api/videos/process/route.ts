import { NextResponse } from "next/server"

import { getCurrentUser } from "@/shared/lib/supabase/server"
import {
  createVideoRepository,
  VideoRepositoryError,
} from "@/features/videos/server/video-repository.server"
import {
  fetchTranscript,
  isTranscriptProviderConfigured,
} from "@/features/videos/server/transcript-provider.server"
import { fetchYouTubeMetadata } from "@/features/videos/server/video-metadata.server"
import { videoErrorResponse, videoInternalErrorResponse } from "@/features/videos/server/http"
import { parseYouTubeUrl } from "@/features/videos/utils/video"

type ProcessBody = {
  url?: unknown
}

function providerErrorResponse(code: string) {
  if (code === "not-configured") {
    return videoErrorResponse(
      503,
      "provider-not-configured",
      "El servicio de transcript no está configurado. Define TRANSCRIPT_API_KEY y reinicia el servidor.",
    )
  }

  if (code === "invalid-config") {
    return videoErrorResponse(
      503,
      "provider-invalid-config",
      "La configuración del servicio de transcript no es válida.",
    )
  }

  if (code === "rate-limited") {
    return videoErrorResponse(
      429,
      "provider-rate-limited",
      "Supadata alcanzó su límite temporal. Intenta de nuevo más tarde.",
    )
  }

  if (code === "unauthorized") {
    return videoErrorResponse(
      503,
      "provider-invalid-key",
      "Supadata rechazó la clave configurada. Verifica TRANSCRIPT_API_KEY.",
    )
  }

  if (code === "payment-required") {
    return videoErrorResponse(
      402,
      "provider-plan-required",
      "Tu plan de Supadata no permite obtener este transcript.",
    )
  }

  if (code === "unsupported-language") {
    return videoErrorResponse(
      422,
      "unsupported-language",
      "Este video no tiene transcript en inglés.",
    )
  }

  if (code === "transcript-unavailable") {
    return videoErrorResponse(
      422,
      "transcript-unavailable",
      "No encontramos un transcript disponible para este video.",
    )
  }

  if (code === "not-found" || code === "forbidden") {
    return videoErrorResponse(
      422,
      "video-unavailable",
      "No pudimos acceder a este video.",
    )
  }

  if (code === "invalid-request") {
    return videoErrorResponse(
      422,
      "transcript-unavailable",
      "No pudimos obtener un transcript para este video.",
    )
  }

  return videoErrorResponse(
    503,
    "provider-unavailable",
    "El servicio de transcript no está disponible. Intenta más tarde.",
  )
}

async function readBody(request: Request): Promise<ProcessBody | null> {
  try {
    const body: unknown = await request.json()
    return typeof body === "object" && body !== null
      ? (body as ProcessBody)
      : null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
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

  const body = await readBody(request)
  if (typeof body?.url !== "string") {
    return videoErrorResponse(
      400,
      "invalid-request",
      "Indica una URL de YouTube.",
    )
  }

  const parsed = parseYouTubeUrl(body.url)
  if (!parsed) {
    return videoErrorResponse(
      400,
      "invalid-url",
      "Pega una URL válida de YouTube.",
    )
  }

  try {
    const repository = await createVideoRepository()
    const existing = await repository.find(user.id, parsed.videoId)

    if (existing) {
      return NextResponse.json({ video: existing, reused: true })
    }

    if (!isTranscriptProviderConfigured()) {
      return providerErrorResponse("not-configured")
    }

    const claim = await repository.claimProcessing(user.id, parsed.videoId)

    if (claim.status === "existing") {
      const saved = await repository.find(user.id, parsed.videoId)
      if (saved) {
        return NextResponse.json({ video: saved, reused: true })
      }
      return videoInternalErrorResponse()
    }

    if (claim.status === "processing") {
      return videoErrorResponse(
        409,
        "processing",
        "Este video ya se está procesando. Intenta abrirlo en unos segundos.",
      )
    }

    if (claim.status === "library-full") {
      return videoErrorResponse(
        409,
        "library-full",
        "Tu biblioteca está llena. Elimina un video para guardar otro.",
      )
    }

    if (claim.status === "daily-limit") {
      return videoErrorResponse(
        429,
        "daily-limit",
        "Alcanzaste el límite diario de 10 videos nuevos.",
      )
    }

    if (claim.status !== "claimed") {
      return videoInternalErrorResponse()
    }

    try {
      const transcript = await fetchTranscript(parsed.url)
      if (!transcript.ok) {
        await repository.releaseProcessing(
          user.id,
          parsed.videoId,
          claim.claimToken,
        )
        return providerErrorResponse(transcript.code)
      }

      const metadata = await fetchYouTubeMetadata(parsed.url, parsed.videoId)
      const timestamp = new Date().toISOString()
      const video = await repository.save(
        user.id,
        {
          videoId: parsed.videoId,
          url: parsed.url,
          title: metadata.title,
          thumbnailUrl: metadata.thumbnailUrl,
          language: transcript.value.language,
          segments: transcript.value.segments,
          positionMs: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        claim.claimToken,
      )

      return NextResponse.json({ video, reused: false }, { status: 201 })
    } catch (error) {
      await repository
        .releaseProcessing(user.id, parsed.videoId, claim.claimToken)
        .catch(() => undefined)
      throw error
    }
  } catch (error) {
    if (error instanceof VideoRepositoryError) {
      if (error.code === "library-full") {
        return videoErrorResponse(
          409,
          "library-full",
          "Tu biblioteca está llena. Elimina un video para guardar otro.",
        )
      }

      if (error.code === "duplicate-video") {
        return videoErrorResponse(
          409,
          "duplicate-video",
          "Este video ya está en tu biblioteca.",
        )
      }
    }

    return videoInternalErrorResponse()
  }
}
