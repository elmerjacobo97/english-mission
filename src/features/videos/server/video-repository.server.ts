import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createSupabaseServerClient } from "@/shared/lib/supabase/server"
import {
  MAX_VIDEO_LIBRARY_ITEMS,
  type TranscriptSegment,
  type VideoLibraryItem,
} from "../utils/video"

export { MAX_VIDEO_LIBRARY_ITEMS }

export type VideoRepositoryErrorCode =
  | "database-error"
  | "library-full"
  | "duplicate-video"
  | "invalid-position"
  | "processing-claim-required"

export class VideoRepositoryError extends Error {
  constructor(
    public readonly code: VideoRepositoryErrorCode,
    message: string,
  ) {
    super(message)
    this.name = "VideoRepositoryError"
  }
}

type QueryResult<T> = {
  data: T
  error: { message: string; code?: string } | null
  count?: number | null
}

type VideoLibraryRow = {
  user_id: string
  video_id: string
  url: string
  title: string
  thumbnail_url: string | null
  language: string
  segments: unknown
  position_ms: number
  created_at: string
  updated_at: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isSegment(value: unknown): value is TranscriptSegment {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.text === "string" &&
    value.text.trim().length > 0 &&
    typeof value.startMs === "number" &&
    Number.isSafeInteger(value.startMs) &&
    value.startMs >= 0 &&
    typeof value.durationMs === "number" &&
    Number.isSafeInteger(value.durationMs) &&
    value.durationMs > 0
  )
}

function rowToVideo(row: unknown): VideoLibraryItem {
  if (!isRecord(row)) {
    throw new VideoRepositoryError(
      "database-error",
      "Stored video has an invalid shape",
    )
  }

  const segments = row.segments
  if (
    typeof row.video_id !== "string" ||
    typeof row.url !== "string" ||
    typeof row.title !== "string" ||
    (row.thumbnail_url !== null && typeof row.thumbnail_url !== "string") ||
    row.language !== "en" ||
    !Array.isArray(segments) ||
    !segments.every(isSegment) ||
    typeof row.position_ms !== "number" ||
    !Number.isSafeInteger(row.position_ms) ||
    row.position_ms < 0 ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    throw new VideoRepositoryError(
      "database-error",
      "Stored video has an invalid shape",
    )
  }

  return {
    videoId: row.video_id,
    url: row.url,
    title: row.title,
    thumbnailUrl: row.thumbnail_url,
    language: "en",
    segments,
    positionMs: row.position_ms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function databaseError(
  operation: string,
  error: { message: string; code?: string },
): VideoRepositoryError {
  if (error.message === "video_library_full") {
    return new VideoRepositoryError(
      "library-full",
      "Video library has reached its limit",
    )
  }

  if (error.message === "processing_claim_required") {
    return new VideoRepositoryError(
      "processing-claim-required",
      "Video processing claim is required",
    )
  }

  if (error.message === "processing_claim_invalid") {
    return new VideoRepositoryError(
      "processing-claim-required",
      "Video processing claim is no longer valid",
    )
  }

  if (error.code === "23505") {
    return new VideoRepositoryError(
      "duplicate-video",
      "Video already exists in library",
    )
  }

  return new VideoRepositoryError(
    "database-error",
    `Could not ${operation}: ${error.message}`,
  )
}

async function listVideos(
  supabase: SupabaseClient,
  userId: string,
): Promise<VideoLibraryItem[]> {
  const result = (await supabase
    .from("video_library")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })) as unknown as QueryResult<
    VideoLibraryRow[]
  >

  if (result.error) {
    throw databaseError("list videos", result.error)
  }

  return (result.data ?? []).map(rowToVideo)
}

async function findVideo(
  supabase: SupabaseClient,
  userId: string,
  videoId: string,
): Promise<VideoLibraryItem | null> {
  const result = (await supabase
    .from("video_library")
    .select("*")
    .eq("user_id", userId)
    .eq("video_id", videoId)
    .maybeSingle()) as unknown as QueryResult<VideoLibraryRow | null>

  if (result.error) {
    throw databaseError("find video", result.error)
  }

  return result.data ? rowToVideo(result.data) : null
}

export type VideoProcessingClaim =
  | { status: "claimed"; claimToken: string }
  | {
      status: "existing" | "processing" | "library-full"
      claimToken: null
    }

async function claimProcessing(
  supabase: SupabaseClient,
  videoId: string,
): Promise<VideoProcessingClaim> {
  const result = (await supabase.rpc("claim_video_processing", {
    p_video_id: videoId,
  })) as unknown as QueryResult<unknown>

  if (result.error) {
    throw databaseError("claim video processing", result.error)
  }

  if (!isRecord(result.data) || typeof result.data.status !== "string") {
    throw new VideoRepositoryError(
      "database-error",
      "Claim response has an invalid shape",
    )
  }

  if (result.data.status === "claimed") {
    if (typeof result.data.claimToken !== "string") {
      throw new VideoRepositoryError(
        "database-error",
        "Claim response has no token",
      )
    }
    return { status: "claimed", claimToken: result.data.claimToken }
  }

  if (
    result.data.status === "existing" ||
    result.data.status === "processing" ||
    result.data.status === "library-full"
  ) {
    return { status: result.data.status, claimToken: null }
  }

  throw new VideoRepositoryError(
    "database-error",
    "Claim response has an invalid status",
  )
}

async function releaseProcessing(
  supabase: SupabaseClient,
  videoId: string,
  claimToken: string,
): Promise<void> {
  const result = (await supabase.rpc("release_video_processing", {
    p_video_id: videoId,
    p_claim_token: claimToken,
  })) as unknown as QueryResult<null>

  if (result.error) {
    throw databaseError("release video processing", result.error)
  }
}

async function saveVideo(
  supabase: SupabaseClient,
  _userId: string,
  video: VideoLibraryItem,
  claimToken: string,
): Promise<VideoLibraryItem> {
  const result = (await supabase.rpc("save_video_library", {
    p_video_id: video.videoId,
    p_url: video.url,
    p_title: video.title,
    p_thumbnail_url: video.thumbnailUrl,
    p_language: video.language,
    p_segments: video.segments,
    p_position_ms: video.positionMs,
    p_created_at: video.createdAt,
    p_updated_at: video.updatedAt,
    p_claim_token: claimToken,
  })) as unknown as QueryResult<VideoLibraryRow>

  if (result.error) {
    throw databaseError("save video", result.error)
  }

  return rowToVideo(result.data)
}

async function deleteVideo(
  supabase: SupabaseClient,
  _userId: string,
  videoId: string,
): Promise<VideoLibraryItem | null> {
  const result = (await supabase.rpc("delete_video_library", {
    p_video_id: videoId,
  })) as unknown as QueryResult<VideoLibraryRow | null>

  if (result.error) {
    throw databaseError("delete video", result.error)
  }

  return result.data ? rowToVideo(result.data) : null
}

async function updatePosition(
  supabase: SupabaseClient,
  _userId: string,
  videoId: string,
  positionMs: number,
  clientUpdatedAt = new Date().toISOString(),
): Promise<VideoLibraryItem | null> {
  if (!Number.isSafeInteger(positionMs) || positionMs < 0) {
    throw new VideoRepositoryError(
      "invalid-position",
      "Video position must be a non-negative integer",
    )
  }

  const result = (await supabase.rpc("update_video_position", {
    p_video_id: videoId,
    p_position_ms: positionMs,
    p_client_updated_at: clientUpdatedAt,
  })) as unknown as QueryResult<VideoLibraryRow | null>

  if (result.error) {
    throw databaseError("update video position", result.error)
  }

  return result.data ? rowToVideo(result.data) : null
}

export type VideoRepository = {
  list: (userId: string) => Promise<VideoLibraryItem[]>
  find: (userId: string, videoId: string) => Promise<VideoLibraryItem | null>
  claimProcessing: (
    userId: string,
    videoId: string,
  ) => Promise<VideoProcessingClaim>
  releaseProcessing: (
    userId: string,
    videoId: string,
    claimToken: string,
  ) => Promise<void>
  save: (
    userId: string,
    video: VideoLibraryItem,
    claimToken: string,
  ) => Promise<VideoLibraryItem>
  delete: (userId: string, videoId: string) => Promise<VideoLibraryItem | null>
  updatePosition: (
    userId: string,
    videoId: string,
    positionMs: number,
    clientUpdatedAt?: string,
  ) => Promise<VideoLibraryItem | null>
}

export async function createVideoRepository(): Promise<VideoRepository> {
  const supabase = await createSupabaseServerClient()

  return {
    list: (userId) => listVideos(supabase, userId),
    find: (userId, videoId) => findVideo(supabase, userId, videoId),
    claimProcessing: (_userId, videoId) => claimProcessing(supabase, videoId),
    releaseProcessing: (_userId, videoId, claimToken) =>
      releaseProcessing(supabase, videoId, claimToken),
    save: (userId, video, claimToken) =>
      saveVideo(supabase, userId, video, claimToken),
    delete: (userId, videoId) => deleteVideo(supabase, userId, videoId),
    updatePosition: (userId, videoId, positionMs, clientUpdatedAt) =>
      updatePosition(supabase, userId, videoId, positionMs, clientUpdatedAt),
  }
}
