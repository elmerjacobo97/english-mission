import type { Metadata } from "next"
import { MissionMap } from "@/features/mission/components/mission-map"

export const metadata: Metadata = {
  title: "Misiones",
  alternates: { canonical: "/" },
}

export default function Home() {
  return <MissionMap />
}
