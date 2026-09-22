"use client"

import { useState } from "react"
import {
  isVideoLibraryItem,
  parseYouTubeUrl,
  type VideoLibraryItem,
} from "../utils/video"

export type VideoLibraryError = {
  code: string
  message: string
}

export type ProcessVideoResult = {
  video: VideoLibraryItem
  reused: boolean
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null
}

async function readResponse(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function responseError(payload: unknown, fallback: VideoLibraryError): VideoLibraryError {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return fallback
  }

  return {
    code:
      typeof payload.error.code === "string"
        ? payload.error.code
        : fallback.code,
    message:
      typeof payload.error.message === "string"
        ? payload.error.message
        : fallback.message,
  }
}

const genericError: VideoLibraryError = {
  code: "request-failed",
  message: "No pudimos completar la solicitud. Intenta de nuevo.",
}

export function useVideoLibrary(initialVideos: VideoLibraryItem[]) {
  const [videos, setVideos] = useState(initialVideos)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null)
  const [error, setError] = useState<VideoLibraryError | null>(null)

  const selectedVideo =
    videos.find((video) => video.videoId === selectedVideoId) ?? null

  function openVideo(videoId: string) {
    if (videos.some((video) => video.videoId === videoId)) {
      setSelectedVideoId(videoId)
      setError(null)
    }
  }

  function updateVideoPosition(videoId: string, positionMs: number) {
    if (!Number.isSafeInteger(positionMs) || positionMs < 0) {
      return
    }
    setVideos((current) =>
      current.map((video) =>
        video.videoId === videoId ? { ...video, positionMs } : video,
      ),
    )
  }

  function closeVideo(positionMs?: number) {
    if (
      selectedVideoId !== null &&
      positionMs !== undefined &&
      Number.isSafeInteger(positionMs) &&
      positionMs >= 0
    ) {
      setVideos((current) =>
        current.map((video) =>
          video.videoId === selectedVideoId
            ? { ...video, positionMs }
            : video,
        ),
      )
    }
    setSelectedVideoId(null)
  }

  async function processVideo(url: string): Promise<ProcessVideoResult | null> {
    setError(null)
    if (!parseYouTubeUrl(url)) {
      setError({
        code: "invalid-url",
        message: "Pega una URL válida de YouTube.",
      })
      return null
    }

    setProcessing(true)
    try {
      const response = await fetch("/api/videos/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      })
      const payload = await readResponse(response)

      if (!response.ok) {
        setError(
          responseError(payload, {
            code: "process-failed",
            message: "No pudimos procesar este video.",
          }),
        )
        return null
      }

      const nextVideo = isRecord(payload) ? payload.video : null
      if (!isVideoLibraryItem(nextVideo)) {
        setError(genericError)
        return null
      }

      const reused = isRecord(payload) && payload.reused === true
      setVideos((current) => [
        nextVideo,
        ...current.filter((video) => video.videoId !== nextVideo.videoId),
      ])
      setSelectedVideoId(nextVideo.videoId)
      return { video: nextVideo, reused }
    } catch {
      setError(genericError)
      return null
    } finally {
      setProcessing(false)
    }
  }

  async function reload(): Promise<boolean> {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/videos")
      const payload = await readResponse(response)
      if (!response.ok) {
        setError(responseError(payload, genericError))
        return false
      }

      const nextVideos = isRecord(payload) ? payload.videos : null
      if (
        !Array.isArray(nextVideos) ||
        !nextVideos.every(isVideoLibraryItem)
      ) {
        setError(genericError)
        return false
      }

      setVideos(nextVideos)
      setSelectedVideoId((current) =>
        nextVideos.some((video) => video.videoId === current) ? current : null,
      )
      return true
    } catch {
      setError(genericError)
      return false
    } finally {
      setLoading(false)
    }
  }

  async function deleteVideo(videoId: string): Promise<boolean> {
    setError(null)
    setDeletingVideoId(videoId)
    try {
      const response = await fetch(
        `/api/videos/${encodeURIComponent(videoId)}`,
        { method: "DELETE" },
      )
      const payload = await readResponse(response)
      if (!response.ok) {
        setError(responseError(payload, genericError))
        return false
      }

      setVideos((current) =>
        current.filter((video) => video.videoId !== videoId),
      )
      setSelectedVideoId((current) =>
        current === videoId ? null : current,
      )
      return true
    } catch {
      setError(genericError)
      return false
    } finally {
      setDeletingVideoId(null)
    }
  }

  return {
    videos,
    selectedVideo,
    selectedVideoId,
    processing,
    loading,
    deletingVideoId,
    error,
    openVideo,
    updateVideoPosition,
    closeVideo,
    processVideo,
    reload,
    deleteVideo,
    clearError: () => setError(null),
  }
}
