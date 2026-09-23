import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { CourseBandOnboarding } from "@/features/mission/components/course-band-onboarding"
import { readProgress } from "@/shared/lib/progress/progress-repository.server"
import { getCurrentUser } from "@/shared/lib/supabase/server"

export const metadata: Metadata = {
  title: "Tu ruta de inglés",
}

export default async function OnboardingPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const progress = await readProgress(user.id)

  if (progress.courseBand) {
    redirect("/")
  }

  return <CourseBandOnboarding />
}
