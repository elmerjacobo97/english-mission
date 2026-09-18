import type { Metadata } from "next"
import { ReviewSession } from "@/features/review/components/review-session"

export const metadata: Metadata = {
  title: "Repaso · English Mission",
}

export default function ReviewPage() {
  return <ReviewSession />
}
