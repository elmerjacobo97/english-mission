import type { Metadata } from "next"
import { Notebook } from "@/features/mission/components/notebook"
import { requireCourseBand } from "@/shared/lib/progress/require-course-band.server"

export const metadata: Metadata = {
  title: "Cuaderno",
  alternates: { canonical: "/notebook" },
}

export default async function NotebookPage() {
  await requireCourseBand()
  return <Notebook />
}
