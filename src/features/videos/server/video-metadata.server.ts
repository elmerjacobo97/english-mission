import "server-only"

export type VideoMetadata = {
  title: string
  thumbnailUrl: string | null
}

const METADATA_TIMEOUT_MS = 5_000

function fallbackMetadata(videoId: string): VideoMetadata {
  return {
    title: `Video de YouTube (${videoId})`,
    thumbnailUrl: null,
  }
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export async function fetchYouTubeMetadata(
  videoUrl: string,
  videoId: string,
): Promise<VideoMetadata> {
  const fallback = fallbackMetadata(videoId)
  const endpoint = new URL("https://www.youtube.com/oembed")
  endpoint.searchParams.set("url", videoUrl)
  endpoint.searchParams.set("format", "json")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS)

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })

    if (!response.ok) {
      return fallback
    }

    const payload: unknown = await response.json()
    if (typeof payload !== "object" || payload === null) {
      return fallback
    }

    const data = payload as Record<string, unknown>
    const title = typeof data.title === "string" ? data.title.trim() : ""

    return {
      title: title || fallback.title,
      thumbnailUrl: isHttpUrl(data.thumbnail_url) ? data.thumbnail_url : null,
    }
  } catch {
    return fallback
  } finally {
    clearTimeout(timeout)
  }
}
