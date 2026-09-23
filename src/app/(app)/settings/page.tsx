import type { Metadata } from "next"
import { CourseBandSettings } from "@/features/mission/components/course-band-settings"
import { requireCourseBand } from "@/shared/lib/progress/require-course-band.server"

export const metadata: Metadata = {
  title: "Configuración",
  alternates: { canonical: "/settings" },
}

export default async function SettingsPage() {
  await requireCourseBand()
  return <CourseBandSettings />
}
