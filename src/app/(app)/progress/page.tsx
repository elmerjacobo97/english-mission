import type { Metadata } from "next"
import { ProgressPanel } from "@/features/progress/components/progress-panel"
import { requireCourseBand } from "@/shared/lib/progress/require-course-band.server"

export const metadata: Metadata = {
  title: "Progreso",
  alternates: { canonical: "/progress" },
}

export default async function ProgressPage() {
  await requireCourseBand()
  return <ProgressPanel />
}
