import type { Metadata } from "next"

import { RehearsalsPage } from "@/features/rehearsal/components/rehearsals-page"
import { createRehearsalRepository } from "@/features/rehearsal/server/rehearsal-repository.server"
import type { RehearsalSession } from "@/features/rehearsal/types"
import { requireCourseBand } from "@/shared/lib/progress/require-course-band.server"

export const metadata: Metadata = {
  title: "Ensayar",
  alternates: { canonical: "/rehearsals" },
}

export default async function RehearsalsRoute() {
  const { user } = await requireCourseBand()
  let initialSessions: RehearsalSession[] = []
  let initialError: string | null = null

  try {
    const repository = await createRehearsalRepository()
    initialSessions = await repository.list(user.id)
  } catch {
    initialError = "No pudimos cargar tus ensayos. Intenta de nuevo."
  }

  return (
    <RehearsalsPage
      key={initialSessions
        .map((session) => `${session.id}:${session.updatedAt}`)
        .join("|")}
      initialSessions={initialSessions}
      initialError={initialError}
    />
  )
}
