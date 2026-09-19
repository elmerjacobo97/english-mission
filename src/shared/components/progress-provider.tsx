"use client"

import { useEffect, useState, type ReactNode } from "react"
import { initProgress } from "@/shared/lib/progress/progress-store"
import type { Progress } from "@/shared/lib/progress/types"
import { SyncBanner } from "./sync-banner"

export function ProgressProvider({
  children,
  initialProgress,
  userId,
}: {
  children: ReactNode
  initialProgress: Progress
  userId: string
}) {
  useState(() => {
    initProgress(initialProgress, userId)
    return null
  })

  useEffect(() => {
    initProgress(initialProgress, userId)
  }, [initialProgress, userId])

  return (
    <>
      {userId ? <SyncBanner /> : null}
      {children}
    </>
  )
}
