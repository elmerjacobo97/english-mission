import "server-only"

import { redirect } from "next/navigation"

import { readProgress } from "./progress-repository.server"
import { getCurrentUser } from "../supabase/server"

export async function requireCourseBand() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  const progress = await readProgress(user.id)

  if (!progress.courseBand) {
    redirect("/onboarding")
  }

  return { progress, user }
}
