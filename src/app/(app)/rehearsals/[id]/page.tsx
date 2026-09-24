import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { RehearsalSessionPage } from "@/features/rehearsal/components/rehearsal-session-page"
import { createRehearsalRepository } from "@/features/rehearsal/server/rehearsal-repository.server"
import { requireCourseBand } from "@/shared/lib/progress/require-course-band.server"

export const metadata: Metadata = {
  title: "Ensayo",
  alternates: { canonical: "/rehearsals" },
}

export default async function RehearsalRoute(
  props: PageProps<"/rehearsals/[id]">,
) {
  const { user } = await requireCourseBand()
  const { id } = await props.params

  const repository = await createRehearsalRepository()
  const session = await repository.find(user.id, id)

  if (!session) {
    notFound()
  }

  return <RehearsalSessionPage initialSession={session} />
}
