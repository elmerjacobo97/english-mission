"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"

export type YouTubePlayerState =
  | "unstarted"
  | "ended"
  | "playing"
  | "paused"
  | "buffering"
  | "cued"
  | "unavailable"

export type YouTubePlayerError =
  | "invalid"
  | "html5"
  | "not-found"
  | "not-embeddable"
  | "unknown"

export type YouTubePlayerController = {
  play: () => void
  pause: () => void
  seekTo: (positionMs: number) => void
  getCurrentTimeMs: () => number
}

type YouTubePlayerProps = {
  videoId: string
  onReady?: (controller: YouTubePlayerController) => void
  onStateChange?: (state: YouTubePlayerState, positionMs: number) => void
  onTimeUpdate?: (positionMs: number) => void
  onError?: (error: YouTubePlayerError) => void
}

type PlayerStatus = {
  videoId: string
  state: YouTubePlayerState
  error: YouTubePlayerError | null
}

type YouTubePlayerInstance = {
  destroy: () => void
  getCurrentTime: () => number
  pauseVideo: () => void
  playVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
}

type YouTubePlayerEvent = {
  data: number
  target: YouTubePlayerInstance
}

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string
      playerVars: Record<string, number | string>
      events: {
        onError: (event: YouTubePlayerEvent) => void
        onReady: (event: YouTubePlayerEvent) => void
        onStateChange: (event: YouTubePlayerEvent) => void
      }
    },
  ) => YouTubePlayerInstance
}

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

const YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api"

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null

export function mapYouTubePlayerState(code: number): YouTubePlayerState {
  if (code === -1) return "unstarted"
  if (code === 0) return "ended"
  if (code === 1) return "playing"
  if (code === 2) return "paused"
  if (code === 3) return "buffering"
  if (code === 5) return "cued"
  return "unavailable"
}

export function mapYouTubePlayerError(code: number): YouTubePlayerError {
  if (code === 2) return "invalid"
  if (code === 5) return "html5"
  if (code === 100) return "not-found"
  if (code === 101 || code === 150) return "not-embeddable"
  return "unknown"
}

function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API requires a browser"))
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise
  }

  youtubeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const resolveApi = () => {
      if (window.YT?.Player) {
        resolve(window.YT)
        return
      }
      reject(new Error("YouTube API did not expose a player"))
    }

    const previousReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.()
      resolveApi()
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${YOUTUBE_IFRAME_API_SRC}"]`,
    )
    if (existingScript) {
      existingScript.addEventListener(
        "error",
        () => reject(new Error("YouTube API failed to load")),
        { once: true },
      )
      return
    }

    const script = document.createElement("script")
    script.src = YOUTUBE_IFRAME_API_SRC
    script.async = true
    script.addEventListener(
      "error",
      () => reject(new Error("YouTube API failed to load")),
      { once: true },
    )
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    youtubeApiPromise = null
    throw error
  })

  return youtubeApiPromise
}

function currentTimeMs(player: YouTubePlayerInstance): number {
  try {
    const seconds = player.getCurrentTime()
    return Number.isFinite(seconds) ? Math.max(0, Math.round(seconds * 1000)) : 0
  } catch {
    return 0
  }
}

function controllerFor(player: YouTubePlayerInstance): YouTubePlayerController {
  return {
    play: () => player.playVideo(),
    pause: () => player.pauseVideo(),
    seekTo: (positionMs) =>
      player.seekTo(Math.max(0, positionMs) / 1000, true),
    getCurrentTimeMs: () => currentTimeMs(player),
  }
}

function playerErrorMessage(error: YouTubePlayerError): string {
  if (error === "not-embeddable") {
    return "Este video no permite reproducción dentro de la aplicación."
  }
  if (error === "not-found") {
    return "No encontramos este video en YouTube."
  }
  return "YouTube no pudo reproducir este video."
}

export function YouTubePlayer({
  videoId,
  onReady,
  onStateChange,
  onTimeUpdate,
  onError,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<PlayerStatus>({
    videoId,
    state: "unstarted",
    error: null,
  })
  const notifyReady = useEffectEvent((controller: YouTubePlayerController) => {
    onReady?.(controller)
  })
  const notifyStateChange = useEffectEvent(
    (nextState: YouTubePlayerState, positionMs: number) => {
      onStateChange?.(nextState, positionMs)
    },
  )
  const notifyTimeUpdate = useEffectEvent((positionMs: number) => {
    onTimeUpdate?.(positionMs)
  })
  const notifyError = useEffectEvent((nextError: YouTubePlayerError) => {
    onError?.(nextError)
  })
  const visibleStatus =
    status.videoId === videoId
      ? status
      : { videoId, state: "unstarted" as const, error: null }

  useEffect(() => {
    let cancelled = false
    let player: YouTubePlayerInstance | null = null
    let positionTimer: number | null = null

    function reportPosition() {
      if (!player || cancelled) {
        return
      }
      notifyTimeUpdate(currentTimeMs(player))
    }

    loadYouTubeIframeApi()
      .then((youtube) => {
        if (cancelled || !containerRef.current) {
          return
        }

        player = new youtube.Player(containerRef.current, {
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              if (cancelled) {
                return
              }
              setStatus({ videoId, state: "cued", error: null })
              notifyReady(controllerFor(event.target))
              positionTimer = window.setInterval(reportPosition, 250)
            },
            onStateChange: (event) => {
              if (cancelled) {
                return
              }
              const nextState = mapYouTubePlayerState(event.data)
              const position = currentTimeMs(event.target)
              setStatus({ videoId, state: nextState, error: null })
              notifyStateChange(nextState, position)
              notifyTimeUpdate(position)
            },
            onError: (event) => {
              if (cancelled) {
                return
              }
              const nextError = mapYouTubePlayerError(event.data)
              setStatus({ videoId, state: "unavailable", error: nextError })
              notifyError(nextError)
            },
          },
        })
      })
      .catch(() => {
        if (cancelled) {
          return
        }
        setStatus({ videoId, state: "unavailable", error: "unknown" })
        notifyError("unknown")
      })

    return () => {
      cancelled = true
      if (positionTimer !== null) {
        window.clearInterval(positionTimer)
      }
      try {
        player?.destroy()
      } catch {
        // Player may fail before iframe initialization finishes.
      }
    }
  }, [videoId])

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-ink shadow-card">
      <div ref={containerRef} className="h-full w-full" data-testid="youtube-player" />
      {visibleStatus.state === "unstarted" && !visibleStatus.error && (
        <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-white/80">
          Reproduce el video cuando quieras comenzar.
        </p>
      )}
      {visibleStatus.error && (
        <p role="alert" className="absolute inset-x-4 bottom-3 rounded-xl bg-ink/85 px-3 py-2 text-center text-xs font-semibold text-white">
          {playerErrorMessage(visibleStatus.error)}
        </p>
      )}
    </div>
  )
}
