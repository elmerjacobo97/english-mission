import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MissionPlayer } from "@/features/mission/components/mission-player"
import { findMission, findPlanEntry } from "@/shared/lib/curriculum/mission-catalog"

export async function generateMetadata(
  props: PageProps<"/mision/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params
  const entry = findPlanEntry(slug)
  if (!entry) {
    return {}
  }
  return {
    title: entry.title,
    description: entry.subtitle,
    alternates: { canonical: `/mision/${slug}` },
  }
}

export default async function MissionPage(props: PageProps<"/mision/[slug]">) {
  const { slug } = await props.params
  const mission = findMission(slug)
  if (!mission) {
    notFound()
  }
  return <MissionPlayer mission={mission} />
}
