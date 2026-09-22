"use client"

import { ArrowClockwiseIcon, LinkSimpleIcon, VideoCameraIcon } from "@phosphor-icons/react"
import { useRef, useState } from "react"
import { PageHeader } from "@/shared/components/page-header"
import { useVideoLibrary } from "../hooks/use-video-library"
import type { VideoLibraryItem } from "../utils/video"
import { VideoLibrary } from "./video-library"
import { VideoSessionView } from "./video-session-view"

type VideosPageProps = {
  initialVideos: VideoLibraryItem[]
  initialError?: string | null
}

export function VideosPage({ initialVideos, initialError = null }: VideosPageProps) {
  const library = useVideoLibrary(initialVideos)
  const [url, setUrl] = useState("")
  const [notice, setNotice] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(initialError)
  const livePositionRef = useRef<{ videoId: string; positionMs: number } | null>(
    null,
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    const result = await library.processVideo(url)
    if (!result) {
      return
    }

    setUrl("")
    setNotice(
      result.reused
        ? "Este video ya estaba guardado. Reanudación lista."
        : "Video guardado. Elige reproducir cuando quieras comenzar.",
    )
  }

  async function handleReload() {
    const reloaded = await library.reload()
    if (reloaded) {
      setLoadError(null)
    }
  }

  function handleOpenVideo(videoId: string) {
    const livePosition = livePositionRef.current
    if (livePosition && library.selectedVideoId === livePosition.videoId) {
      library.updateVideoPosition(livePosition.videoId, livePosition.positionMs)
    }
    livePositionRef.current = null
    library.openVideo(videoId)
  }

  function handleCloseVideo(positionMs: number) {
    if (library.selectedVideo) {
      livePositionRef.current = null
      library.closeVideo(positionMs)
    }
  }

  const error = library.error
  const busy = library.processing || library.deletingVideoId !== null

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageHeader
        icon={VideoCameraIcon}
        title="Videos"
        description="Escucha videos reales en inglés, línea por línea y a tu ritmo."
      />

      <section className="relative overflow-hidden rounded-[2rem] border-2 border-ink/10 bg-ink p-5 text-paper shadow-pop sm:p-6">
        <div
          aria-hidden
          className="absolute -right-12 -top-16 size-44 rounded-full border-[18px] border-accent/40"
        />
        <div
          aria-hidden
          className="absolute -bottom-20 -left-12 size-40 rounded-full border-[14px] border-teal/40"
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink">
              <LinkSimpleIcon weight="bold" size={22} aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-xl font-bold">Pega un video para empezar</h2>
              <p className="text-sm font-semibold text-paper/75">
                Aceptamos youtube.com/watch, youtu.be y youtube.com/shorts.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            <label htmlFor="youtube-url" className="font-display text-sm font-bold">
              URL de YouTube
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="youtube-url"
                name="youtube-url"
                type="text"
                inputMode="url"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value)
                  if (error) {
                    library.clearError()
                  }
                }}
                placeholder="https://youtu.be/..."
                autoComplete="off"
                spellCheck={false}
                aria-describedby="youtube-url-help"
                className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-white/15 bg-white/10 px-4 font-semibold text-white placeholder:text-paper/45 focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="flex min-h-12 items-center justify-center rounded-2xl bg-accent px-5 font-display font-bold text-ink shadow-[0_4px_0_#9a3412] transition hover:-translate-y-0.5 active:translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
              >
                {library.processing ? "Procesando..." : "Procesar video"}
              </button>
            </div>
            <p id="youtube-url-help" className="text-xs font-semibold text-paper/60">
              Guardamos transcript y posición. Nunca descargamos audio ni video.
            </p>
          </form>
        </div>
      </section>

      {notice && (
        <p role="status" aria-live="polite" className="rounded-2xl border-2 border-teal/20 bg-teal-soft px-4 py-3 text-sm font-semibold text-teal-strong">
          {notice}
        </p>
      )}

      {loadError && (
        <section role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-error/20 bg-error-soft px-4 py-3">
          <p className="text-sm font-semibold text-error">{loadError}</p>
          <button
            type="button"
            onClick={() => void handleReload()}
            disabled={library.loading}
            className="flex min-h-10 items-center gap-1.5 rounded-xl bg-error px-3 font-display text-sm font-bold text-white disabled:opacity-50"
          >
            <ArrowClockwiseIcon weight="bold" size={16} aria-hidden />
            {library.loading ? "Cargando..." : "Reintentar"}
          </button>
        </section>
      )}

      {error && (
        <section
          role="alert"
          data-error-code={error.code}
          className="rounded-2xl border-2 border-error/20 bg-error-soft px-4 py-3"
        >
          <p className="text-sm font-semibold text-error">{error.message}</p>
          {(error.code === "transcript-unavailable" ||
            error.code === "unsupported-language") && (
            <p className="mt-1 text-xs font-semibold text-error/80">
              Prueba otro video con transcript disponible en inglés.
            </p>
          )}
        </section>
      )}

      {library.selectedVideo && (
        <VideoSessionView
          video={library.selectedVideo}
          onClose={handleCloseVideo}
          onPositionChange={(positionMs) => {
            livePositionRef.current = {
              videoId: library.selectedVideo?.videoId ?? "",
              positionMs,
            }
          }}
          isDeleting={library.deletingVideoId === library.selectedVideo.videoId}
        />
      )}

      <VideoLibrary
        videos={library.videos}
        selectedVideoId={library.selectedVideoId}
        deletingVideoId={library.deletingVideoId}
        onOpen={handleOpenVideo}
        onDelete={library.deleteVideo}
      />
    </main>
  )
}
