"use client"

import { ArrowLeftIcon, VideoCameraIcon } from "@phosphor-icons/react"
import { TranscriptViewer } from "./transcript-viewer"
import { YouTubePlayer } from "./youtube-player"
import { useVideoSession } from "../hooks/use-video-session"
import { formatVideoTime, type VideoLibraryItem } from "../utils/video"

type VideoSessionViewProps = {
  video: VideoLibraryItem
  onClose: (positionMs: number) => void
  onPositionChange?: (positionMs: number) => void
  isDeleting?: boolean
}

function playerMessage(
  state: ReturnType<typeof useVideoSession>["playerState"],
  error: ReturnType<typeof useVideoSession>["playerError"],
  positionMs: number,
  positionSyncError: boolean,
): string | null {
  if (positionSyncError) {
    return "No pudimos guardar tu posición. Revisa tu conexión e inténtalo otra vez."
  }
  if (error === "not-embeddable") {
    return "Este video no permite reproducción dentro de la aplicación."
  }
  if (error === "not-found") {
    return "No encontramos este video en YouTube."
  }
  if (error) {
    return "YouTube no pudo reproducir este video."
  }
  if (state === "paused") {
    return `Pausado en ${formatVideoTime(positionMs)}. Tu posición queda guardada.`
  }
  if (state === "ended") {
    return "Video terminado. Puedes volver a cualquier línea del transcript."
  }
  if (state === "buffering") {
    return "Cargando video..."
  }
  return null
}

export function VideoSessionView({
  video,
  onClose,
  onPositionChange,
  isDeleting = false,
}: VideoSessionViewProps) {
  const session = useVideoSession(video, {
    persistOnUnmount: !isDeleting,
    onPositionChange,
  })
  const statusMessage = playerMessage(
    session.playerState,
    session.playerError,
    session.currentTimeMs,
    session.positionSyncError,
  )

  return (
    <section
      aria-labelledby="video-session-title"
      className="flex flex-col gap-4 rounded-[2rem] border-2 border-ink/10 bg-surface p-3 shadow-card sm:p-5"
    >
      <header className="flex items-start gap-3">
        <VideoCameraIcon
          weight="fill"
          size={24}
          className="mt-1 shrink-0 text-accent-strong"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xs font-bold uppercase tracking-widest text-muted">
            Escucha activa · inglés
          </p>
          <h2 id="video-session-title" className="mt-1 font-display text-xl font-bold leading-tight">
            {video.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onClose(session.currentTimeMs)}
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl border-2 border-ink/10 bg-paper px-3 font-display text-sm font-semibold text-muted transition hover:text-ink"
        >
          <ArrowLeftIcon weight="bold" size={16} aria-hidden />
          Biblioteca
        </button>
      </header>

      <YouTubePlayer
        key={video.videoId}
        videoId={video.videoId}
        onReady={session.handlePlayerReady}
        onStateChange={session.handlePlayerStateChange}
        onTimeUpdate={session.handleTimeUpdate}
        onError={session.handlePlayerError}
      />

      {statusMessage && (
        <p
          role={
            session.playerError || session.positionSyncError
              ? "alert"
              : "status"
          }
          aria-live="polite"
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            session.playerError
              ? "border-2 border-error/20 bg-error-soft text-error"
              : "border-2 border-teal/20 bg-teal-soft text-teal-strong"
          }`}
        >
          {statusMessage}
        </p>
      )}

      {!session.playerError && session.positionRestored && video.positionMs > 0 && (
        <p className="text-sm font-semibold text-muted">
          Reanudación lista cerca de {formatVideoTime(video.positionMs)}. Usa
          controles del player para comenzar.
        </p>
      )}

      <TranscriptViewer
        segments={video.segments}
        activeSegmentIndex={session.activeSegmentIndex}
        onSelectSegment={session.selectSegment}
      />
    </section>
  )
}
