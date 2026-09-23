"use client"

import { useSyncExternalStore } from "react"
import * as progressSync from "@/shared/lib/progress/progress-sync"

export function SyncBanner() {
  const sync = useSyncExternalStore(
    progressSync.subscribeSync,
    progressSync.getSyncSnapshot,
    progressSync.getSyncServerSnapshot,
  )

  if (sync.state !== "error") {
    return null
  }

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="mb-4 flex items-center justify-between gap-4 rounded-2xl border-2 border-error/30 bg-error-soft px-4 py-3 text-sm shadow-card"
    >
      <p className="font-semibold">No pudimos guardar tu progreso.</p>
      <button
        type="button"
        onClick={() => void progressSync.retry()}
        className="ui-button ui-button-secondary shrink-0 border-error/30 px-3 text-error hover:bg-error/10"
      >
        Reintentar
      </button>
    </aside>
  )
}
