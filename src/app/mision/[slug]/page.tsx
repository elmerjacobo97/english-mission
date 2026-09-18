import { notFound } from "next/navigation"
import { MissionPlayer } from "@/features/mission/components/mission-player"
import { findMission } from "@/lib/curriculum/mission-catalog"

export default async function MissionPage(props: PageProps<"/mision/[slug]">) {
  const { slug } = await props.params
  const mission = findMission(slug)
  if (!mission) {
    notFound()
  }
  return <MissionPlayer mission={mission} />
}
