"use client"

import { useMemo, useState } from "react"
import { useProgress } from "@/shared/hooks/use-progress"
import { buildReviewQueue } from "@/shared/lib/review/review-queue"

export function useDueReviews(): number {
  const { progress } = useProgress()
  const [now] = useState(() => Date.now())
  return useMemo(
    () => buildReviewQueue(progress, now).length,
    [progress, now],
  )
}
