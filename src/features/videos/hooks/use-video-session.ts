"use client"

import { useEffect, useRef, useState } from "react"
import type {
  YouTubePlayerController,
  YouTubePlayerError,
  YouTubePlayerState,
} from "../components/youtube-player"
import {
  getActiveTranscriptSegmentIndex,
  type TranscriptSegment,
  type VideoLibraryItem,
} from "../utils/video"

type VideoSessionPlayerState = YouTubePlayerState | "idle"

type SessionPosition = {
  videoId: string | null
  positionMs: number
}

type SessionState = {
  videoId: string | null
  playerState: VideoSessionPlayerState
  playerError: YouTubePlayerError | null
  positionMs: number
  positionRestored: boolean
  positionSyncError: boolean
}

type VideoSessionOptions = {
  persistOnUnmount?: boolean
  onPositionChange?: (positionMs: number) => void
}

function initialSessionState(video: VideoLibraryItem | null): SessionState {
  return {
    videoId: video?.videoId ?? null,
    playerState: video ? "unstarted" : "idle",
    playerError: null,
    positionMs: video?.positionMs ?? 0,
    positionRestored: false,
    positionSyncError: false,
  }
}

async function savePosition(
  videoId: string,
  positionMs: number,
  updatedAt: string,
  keepalive = false,
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(
        `/api/videos/${encodeURIComponent(videoId)}/position`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ positionMs, updatedAt }),
          ...(keepalive ? { keepalive: true } : {}),
        },
      )
      if (response.ok) {
        return true
      }
    } catch {
      // Retry once. Current player state remains usable offline.
    }
  }
  return false
}

export function useVideoSession(
  video: VideoLibraryItem | null,
  {
    persistOnUnmount = true,
    onPositionChange,
  }: VideoSessionOptions = {},
) {
  const videoId = video?.videoId ?? null
  const [state, setState] = useState<SessionState>(() =>
    initialSessionState(video),
  )
  const playerRef = useRef<YouTubePlayerController | null>(null)
  const persistenceEnabledRef = useRef(true)
  const persistenceQueueRef = useRef(Promise.resolve())
  const sessionRef = useRef<SessionPosition>({
    videoId: video?.videoId ?? null,
    positionMs: video?.positionMs ?? 0,
  })

  useEffect(() => {
    if (sessionRef.current.videoId === videoId) {
      return
    }

    sessionRef.current = {
      videoId,
      positionMs: video?.positionMs ?? 0,
    }
    playerRef.current = null
  }, [videoId, video?.positionMs])

  useEffect(() => {
    persistenceEnabledRef.current = persistOnUnmount
  }, [persistOnUnmount])

  const currentState =
    state.videoId === videoId ? state : initialSessionState(video)

  function updateState(patch: Partial<Omit<SessionState, "videoId">>) {
    setState((previous) => ({
      ...(previous.videoId === videoId
        ? previous
        : initialSessionState(video)),
      ...patch,
      videoId,
    }))
  }

  function updatePosition(positionMs: number) {
    if (!Number.isFinite(positionMs) || positionMs < 0) {
      return
    }
    const nextPosition = Math.round(positionMs)
    sessionRef.current.positionMs = nextPosition
    onPositionChange?.(nextPosition)
    updateState({ positionMs: nextPosition })
  }

  function persistPosition(keepalive = false) {
    const { videoId, positionMs } = sessionRef.current
    if (videoId === null || !persistenceEnabledRef.current) {
      return
    }

    const updatedAt = new Date().toISOString()
    const savedVideoId = videoId
    persistenceQueueRef.current = persistenceQueueRef.current.then(async () => {
      const saved = await savePosition(
        savedVideoId,
        positionMs,
        updatedAt,
        keepalive,
      )
      if (!saved) {
        setState((previous) =>
          previous.videoId === savedVideoId
            ? { ...previous, positionSyncError: true }
            : previous,
        )
      }
    })
    void persistenceQueueRef.current
  }

  useEffect(() => {
    function handlePageHide() {
      persistPosition(true)
    }

    window.addEventListener("pagehide", handlePageHide)
    return () => window.removeEventListener("pagehide", handlePageHide)
  }, [])

  useEffect(() => {
    const videoId = video?.videoId
    return () => {
      if (videoId && sessionRef.current.videoId === videoId) {
        persistPosition(true)
      }
    }
  }, [video?.videoId])

  function handlePlayerReady(controller: YouTubePlayerController) {
    playerRef.current = controller
    const position = video?.positionMs ?? 0
    if (position > 0) {
      controller.seekTo(position)
    }
    sessionRef.current.positionMs = position
    updateState({ positionMs: position, positionRestored: true })
  }

  function handlePlayerStateChange(
    nextState: YouTubePlayerState,
    positionMs: number,
  ) {
    const nextPosition = Number.isFinite(positionMs)
      ? Math.max(0, Math.round(positionMs))
      : 0
    sessionRef.current.positionMs = nextPosition
    updateState({ playerState: nextState, positionMs: nextPosition })
    if (nextState === "paused" || nextState === "ended") {
      persistPosition()
    }
  }

  function handlePlayerError(error: YouTubePlayerError) {
    updateState({ playerError: error, playerState: "unavailable" })
  }

  function seekTo(positionMs: number) {
    const nextPosition = Math.max(0, Math.round(positionMs))
    playerRef.current?.seekTo(nextPosition)
    updatePosition(nextPosition)
  }

  const activeSegmentIndex = getActiveTranscriptSegmentIndex(
    video?.segments ?? [],
    currentState.positionMs,
  )

  return {
    playerState: currentState.playerState,
    playerError: currentState.playerError,
    currentTimeMs: currentState.positionMs,
    positionRestored: currentState.positionRestored,
    positionSyncError: currentState.positionSyncError,
    activeSegmentIndex,
    handlePlayerReady,
    handlePlayerStateChange,
    handlePlayerError,
    handleTimeUpdate: updatePosition,
    seekTo,
    selectSegment: (segment: TranscriptSegment) => seekTo(segment.startMs),
  }
}
