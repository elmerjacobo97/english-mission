import type { Metadata } from "next"
import { ReviewSession } from "@/features/review/components/review-session"

export const metadata: Metadata = {
  title: "Repaso",
  alternates: { canonical: "/review" },
}

export default function ReviewPage() {
  return <ReviewSession />
}
