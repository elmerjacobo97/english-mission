"use client"

/* eslint-disable @next/next/no-img-element */

import {
  ClockIcon,
  LockIcon,
  PlayIcon,
  TrashIcon,
  VideoCameraIcon,
  XIcon,
} from "@phosphor-icons/react"
import { useEffect, useRef, useState } from "react"
import {
  formatVideoTime,
  getTranscriptDurationMs,
  MAX_VIDEO_LIBRARY_ITEMS,
  type VideoLibraryItem,
} from "../utils/video"

type VideoLibraryProps = {
  videos: VideoLibraryItem[]
  selectedVideoId: string | null
  deletingVideoId: string | null
  onOpen: (videoId: string) => void
  onDelete: (videoId: string) => Promise<boolean>
}

function Thumbnail({ video }: { video: VideoLibraryItem }) {
  const [failed, setFailed] = useState(false)

  if (video.thumbnailUrl && !failed) {
    return (
      <img
        src={video.thumbnailUrl}
        alt={`Miniatura de ${video.title}`}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-24 w-36 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-44"
      />
    )
  }

  return (
    <div
      aria-hidden
      className="flex h-24 w-36 shrink-0 items-center justify-center rounded-2xl bg-ink text-paper sm:h-28 sm:w-44"
    >
      <VideoCameraIcon weight="duotone" size={30} />
    </div>
  )
}

export function VideoLibrary({
  videos,
  selectedVideoId,
  deletingVideoId,
  onOpen,
  onDelete,
}: VideoLibraryProps) {
  const [confirmingVideoId, setConfirmingVideoId] = useState<string | null>(null)
  const cancelConfirmationRef = useRef<HTMLButtonElement>(null)
  const deleteTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const libraryHeadingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (confirmingVideoId) {
      cancelConfirmationRef.current?.focus()
    }
  }, [confirmingVideoId])

  function cancelDelete() {
    const videoId = confirmingVideoId
    setConfirmingVideoId(null)
    if (videoId) {
      window.requestAnimationFrame(() => deleteTriggerRefs.current[videoId]?.focus())
    }
  }

  async function confirmDelete(videoId: string) {
    const deleted = await onDelete(videoId)
    if (deleted) {
      setConfirmingVideoId(null)
      window.requestAnimationFrame(() => libraryHeadingRef.current?.focus())
    }
  }

  return (
    <section
      aria-labelledby="video-library-title"
      className="flex flex-col gap-4"
    >
      <header className="flex items-end justify-between gap-3 px-1">
        <div className="flex flex-col gap-1">
          <h2
            ref={libraryHeadingRef}
            id="video-library-title"
            tabIndex={-1}
            className="font-display text-lg font-bold outline-none"
          >
            Tu biblioteca
          </h2>
          <p className="text-sm font-semibold text-muted">
            Videos guardados vuelven sin pedir otro transcript.
          </p>
        </div>
        <p className="shrink-0 text-right">
          <span className="inline-block rounded-full border-2 border-ink/10 bg-surface px-3 py-1.5 font-display text-sm font-bold shadow-card">
            {videos.length} de {MAX_VIDEO_LIBRARY_ITEMS}
          </span>
          <span className="mt-1 block text-xs font-semibold text-muted">
            videos guardados
          </span>
        </p>
      </header>

      {videos.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-ink/15 bg-white/60 p-6 text-center">
          <VideoCameraIcon
            weight="duotone"
            size={36}
            className="text-teal-strong"
            aria-hidden
          />
          <p className="font-display font-semibold">Todavía no guardas videos</p>
          <p className="max-w-sm text-sm font-semibold text-muted">
            Pega una URL arriba para crear tu primera sesión de escucha.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {videos.map((video) => {
            const durationMs = getTranscriptDurationMs(video.segments)
            const isSelected = video.videoId === selectedVideoId
            const isDeleting = video.videoId === deletingVideoId
            const isConfirming = video.videoId === confirmingVideoId

            return (
              <li
                key={video.videoId}
                className={`rounded-3xl border-2 bg-surface p-3 shadow-card transition sm:p-4 ${
                  isSelected
                    ? "border-teal/40 shadow-pop"
                    : "border-ink/10"
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => onOpen(video.videoId)}
                    aria-label={`Abrir ${video.title}`}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <Thumbnail video={video} />
                    <span className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                      <span className="line-clamp-3 font-display text-base font-bold leading-tight sm:text-lg">
                        {video.title}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted">
                        <span className="flex items-center gap-1">
                          <ClockIcon size={14} aria-hidden />
                          {formatVideoTime(durationMs)}
                        </span>
                        <span>
                          {video.positionMs > 0
                            ? `Reanudar en ${formatVideoTime(video.positionMs)}`
                            : "Sin empezar"}
                        </span>
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingVideoId(video.videoId)}
                    ref={(element) => {
                      deleteTriggerRefs.current[video.videoId] = element
                    }}
                    disabled={isDeleting || isConfirming}
                    aria-label={`Eliminar ${video.title}`}
                    className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-ink/10 bg-paper text-muted transition hover:border-error/30 hover:text-error disabled:cursor-wait disabled:opacity-50"
                  >
                    <TrashIcon weight="bold" size={18} aria-hidden />
                  </button>
                </div>

                {isConfirming && (
                  <div
                    role="alertdialog"
                    aria-modal="false"
                    aria-labelledby={`delete-title-${video.videoId}`}
                    aria-label={`Confirmar eliminación de ${video.title}`}
                    className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-error-soft px-3 py-2"
                  >
                    <span
                      id={`delete-title-${video.videoId}`}
                      className="text-sm font-semibold text-error"
                    >
                      ¿Eliminar este video?
                    </span>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        ref={cancelConfirmationRef}
                        onClick={cancelDelete}
                        className="flex min-h-10 items-center gap-1 rounded-xl border-2 border-ink/10 bg-surface px-3 font-display text-sm font-semibold"
                      >
                        <XIcon size={16} aria-hidden />
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => void confirmDelete(video.videoId)}
                        disabled={isDeleting}
                        className="flex min-h-10 items-center gap-1 rounded-xl bg-error px-3 font-display text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <TrashIcon size={16} aria-hidden />
                        {isDeleting ? "Eliminando..." : "Eliminar"}
                      </button>
                    </span>
                  </div>
                )}

                {!isConfirming && isSelected && (
                  <p className="mt-3 flex items-center gap-1.5 px-1 text-xs font-bold text-teal-strong">
                    <PlayIcon weight="fill" size={14} aria-hidden />
                    Video abierto
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {videos.length >= MAX_VIDEO_LIBRARY_ITEMS && (
        <p className="flex items-start gap-2 rounded-2xl border-2 border-accent/25 bg-paper px-4 py-3 text-sm font-semibold text-accent-deep">
          <LockIcon weight="fill" size={18} className="mt-0.5 shrink-0" aria-hidden />
          Biblioteca llena. Elimina un video para guardar otro.
        </p>
      )}
    </section>
  )
}
