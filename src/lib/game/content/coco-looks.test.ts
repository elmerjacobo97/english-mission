import { describe, expect, test } from "vitest"
import { CHARACTERS } from "./characters"
import { LOOK_PRICES } from "@/lib/progress/looks"
import { COCO_LOOKS } from "./coco-looks"

describe("COCO_LOOKS", () => {
  test("has five entries and classic is free", () => {
    expect(COCO_LOOKS).toHaveLength(5)
    expect(COCO_LOOKS[0].id).toBe("classic")
    expect(COCO_LOOKS[0].price).toBe(0)
  })

  test("every look price matches LOOK_PRICES", () => {
    for (const look of COCO_LOOKS) {
      expect(LOOK_PRICES[look.id], look.id).toBe(look.price)
    }
    expect(COCO_LOOKS.map((look) => look.price)).toEqual([0, 25, 40, 60, 80])
  })

  test("classic paints the same hex as CHARACTERS.coco", () => {
    const classic = COCO_LOOKS.find((look) => look.id === "classic")
    expect(classic?.shirt).toBe(CHARACTERS.coco.shirt)
    expect(classic?.hair).toBe(CHARACTERS.coco.hair)
    expect(classic?.background).toBe(CHARACTERS.coco.background)
  })
})
