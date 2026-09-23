import type { Metadata } from "next"
import { MissionMap } from "@/features/mission/components/mission-map"
import { requireCourseBand } from "@/shared/lib/progress/require-course-band.server"

export const metadata: Metadata = {
  title: "Misiones",
  alternates: { canonical: "/" },
}

export default async function Home() {
  await requireCourseBand()
  return <MissionMap />
}
