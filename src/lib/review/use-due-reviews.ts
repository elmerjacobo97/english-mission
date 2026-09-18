"use client"

import { useMemo, useState } from "react"
import { useProgress } from "@/lib/progress/use-progress"
import { buildReviewQueue } from "../utils/review-queue"

export function useDueReviews(): number {
  const { progress } = useProgress()
  const [now] = useState(() => Date.now())
  return useMemo(
    () => buildReviewQueue(progress, now).length,
    [progress, now],
  )
}
