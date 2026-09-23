import type { Metadata } from "next"
import { ReviewSession } from "@/features/review/components/review-session"
import { requireCourseBand } from "@/shared/lib/progress/require-course-band.server"

export const metadata: Metadata = {
  title: "Repaso",
  alternates: { canonical: "/review" },
}

export default async function ReviewPage() {
  await requireCourseBand()
  return <ReviewSession />
}
