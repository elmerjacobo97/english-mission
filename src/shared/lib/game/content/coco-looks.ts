import { LOOK_PRICES } from "@/shared/lib/progress/looks"
import type { CocoLookId } from "@/shared/lib/progress/types"

export type CocoLook = {
  id: CocoLookId
  name: string
  price: number
  shirt: string
  hair: string
  background: string
}

export const COCO_LOOKS: CocoLook[] = [
  {
    id: "classic",
    name: "Coco clásico",
    price: LOOK_PRICES.classic,
    shirt: "#facc15",
    hair: "#dc2626",
    background: "#dcfce7",
  },
  {
    id: "ocean",
    name: "Océano",
    price: LOOK_PRICES.ocean,
    shirt: "#0d9488",
    hair: "#1d4ed8",
    background: "#e0f2fe",
  },
  {
    id: "sunset",
    name: "Atardecer",
    price: LOOK_PRICES.sunset,
    shirt: "#f97316",
    hair: "#7c3aed",
    background: "#ffedd5",
  },
  {
    id: "night",
    name: "Noche",
    price: LOOK_PRICES.night,
    shirt: "#1e3a8a",
    hair: "#fbbf24",
    background: "#e2e8f0",
  },
  {
    id: "party",
    name: "Fiesta",
    price: LOOK_PRICES.party,
    shirt: "#db2777",
    hair: "#06b6d4",
    background: "#fce7f3",
  },
]
