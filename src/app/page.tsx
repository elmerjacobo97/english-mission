import { MissionMap } from "@/features/mission/components/mission-map"
import { missions } from "@/features/mission/content/mission-catalog"

export default function Home() {
  return <MissionMap missions={missions} />
}
