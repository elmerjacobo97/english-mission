export type TranscriptSegment = {
  text: string
  startMs: number
  durationMs: number
}

export type VideoLibraryItem = {
  videoId: string
  url: string
  title: string
  thumbnailUrl: string | null
  language: "en"
  segments: TranscriptSegment[]
  positionMs: number
  createdAt: string
  updatedAt: string
}

export type ParsedYouTubeUrl = {
  videoId: string
  url: string
}

export type TranscriptNormalizationError =
  | "invalid-response"
  | "unsupported-language"
  | "transcript-unavailable"

export type NormalizedTranscript = {
  language: "en"
  segments: TranscriptSegment[]
}

export type TranscriptNormalizationResult =
  | { ok: true; value: NormalizedTranscript }
  | { ok: false; code: TranscriptNormalizationError }

export const MAX_VIDEO_LIBRARY_ITEMS = 20

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
])
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

function validVideoId(value: string | null | undefined): value is string {
  return value !== null && value !== undefined && VIDEO_ID_PATTERN.test(value)
}

function pathParts(pathname: string): string[] {
  return pathname.split("/").filter(Boolean)
}

export function parseYouTubeUrl(value: string): ParsedYouTubeUrl | null {
  const urlValue = value.trim()

  if (!urlValue) {
    return null
  }

  let url: URL
  try {
    url = new URL(urlValue)
  } catch {
    return null
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password
  ) {
    return null
  }

  const hostname = url.hostname.toLowerCase()
  const parts = pathParts(url.pathname)
  let videoId: string | null = null

  if (hostname === "youtu.be") {
    if (parts.length === 1 && !url.searchParams.has("v")) {
      videoId = parts[0] ?? null
    }
  } else if (YOUTUBE_HOSTS.has(hostname)) {
    const path = `/${parts.join("/")}`

    if (path === "/watch") {
      const values = url.searchParams.getAll("v")
      videoId = values.length === 1 ? values[0] ?? null : null
    } else if (parts.length === 2 && parts[0] === "shorts") {
      videoId = parts[1] ?? null
    }
  }

  if (!validVideoId(videoId)) {
    return null
  }

  return { videoId, url: urlValue }
}

export function isYouTubeVideoId(value: string): boolean {
  return VIDEO_ID_PATTERN.test(value)
}

export function getActiveTranscriptSegmentIndex(
  segments: TranscriptSegment[],
  currentTimeMs: number,
): number | null {
  if (!Number.isFinite(currentTimeMs) || currentTimeMs < 0) {
    return null
  }

  const index = segments.findIndex(
    (segment) =>
      currentTimeMs >= segment.startMs &&
      currentTimeMs - segment.startMs < segment.durationMs,
  )

  return index === -1 ? null : index
}

export function getTranscriptDurationMs(segments: TranscriptSegment[]): number {
  return segments.reduce(
    (duration, segment) =>
      Math.max(duration, segment.startMs + segment.durationMs),
    0,
  )
}

export function formatVideoTime(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function isTranscriptSegment(value: unknown): value is TranscriptSegment {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.text === "string" &&
    value.text.trim().length > 0 &&
    validMilliseconds(value.startMs, 0) &&
    validMilliseconds(value.durationMs, 1)
  )
}

export function isVideoLibraryItem(value: unknown): value is VideoLibraryItem {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.videoId === "string" &&
    typeof value.url === "string" &&
    typeof value.title === "string" &&
    (value.thumbnailUrl === null || typeof value.thumbnailUrl === "string") &&
    value.language === "en" &&
    Array.isArray(value.segments) &&
    value.segments.every(isTranscriptSegment) &&
    validMilliseconds(value.positionMs, 0) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function validMilliseconds(value: unknown, minimum: number): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum
  )
}

export function normalizeTranscriptPayload(
  payload: unknown,
): TranscriptNormalizationResult {
  if (!isRecord(payload)) {
    return { ok: false, code: "invalid-response" }
  }

  if (payload.lang !== "en") {
    return { ok: false, code: "unsupported-language" }
  }

  if (!Array.isArray(payload.content) || payload.content.length === 0) {
    return { ok: false, code: "transcript-unavailable" }
  }

  const segments: TranscriptSegment[] = []

  for (const item of payload.content) {
    if (!isRecord(item) || typeof item.text !== "string") {
      return { ok: false, code: "invalid-response" }
    }

    const text = item.text.trim().replace(/\s+/g, " ")
    if (
      !text ||
      !validMilliseconds(item.offset, 0) ||
      !validMilliseconds(item.duration, 1) ||
      (item.lang !== undefined && item.lang !== "en")
    ) {
      return { ok: false, code: "invalid-response" }
    }

    segments.push({
      text,
      startMs: item.offset,
      durationMs: item.duration,
    })
  }

  return {
    ok: true,
    value: { language: "en", segments },
  }
}
