import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MissionPlayer } from "@/features/mission/components/mission-player"
import { findMission, findPlanEntry } from "@/shared/lib/curriculum/mission-catalog"
import { requireCourseBand } from "@/shared/lib/progress/require-course-band.server"

export async function generateMetadata(
  props: PageProps<"/mission/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params
  const entry = findPlanEntry(slug)
  if (!entry) {
    return {}
  }
  return {
    title: entry.title,
    description: entry.subtitle,
    alternates: { canonical: `/mission/${slug}` },
  }
}

export default async function MissionPage(props: PageProps<"/mission/[slug]">) {
  await requireCourseBand()
  const { slug } = await props.params
  const mission = findMission(slug)
  if (!mission) {
    notFound()
  }
  return <MissionPlayer mission={mission} />
}
