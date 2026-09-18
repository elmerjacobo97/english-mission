import type { Mission } from "../types/mission"
import { supermarketMission } from "./mission-01-supermarket"

export const missions: Mission[] = [supermarketMission]

export function findMission(slug: string): Mission | undefined {
  return missions.find((mission) => mission.slug === slug)
}
