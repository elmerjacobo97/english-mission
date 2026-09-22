import { describe, expect, test } from "vitest"
import { CHARACTERS } from "./characters"
import type { CharacterId } from "../types/character"

const characterIds: CharacterId[] = [
  "coco", "marta", "nico", "beto", "cami",
  "chofer", "rosa", "sergio", "sofia", "tere",
]

describe("CHARACTERS", () => {
  test("contains exactly the current ten character identifiers", () => {
    expect(Object.keys(CHARACTERS).sort()).toEqual([...characterIds].sort())
  })

  test("has complete narrative and visual profiles", () => {
    for (const id of characterIds) {
      const profile = CHARACTERS[id]
      expect(profile.name, id).not.toBe("")
      expect(profile.role, id).not.toBe("")
      expect(profile.definingTrait, id).not.toBe("")
      expect(profile.personality, id).not.toBe("")
      expect(profile.motivation, id).not.toBe("")
      expect(profile.relationship, id).not.toBe("")
      expect(profile.speechStyle, id).not.toBe("")
      expect(profile.narrativeFunction, id).not.toBe("")
      expect(profile.visual.species, id).toBeTruthy()
      expect(profile.visual.skin, id).not.toBe("")
      expect(profile.visual.hair, id).not.toBe("")
      expect(profile.visual.shirt, id).not.toBe("")
      expect(profile.visual.background, id).not.toBe("")
      expect(profile.visual.hairStyle, id).toBeTruthy()
      expect(profile.visual.accessory, id).toBeTruthy()
    }
  })

  test("gives every character a distinct silhouette", () => {
    const signatures = characterIds.map((id) => {
      const visual = CHARACTERS[id].visual
      return `${visual.species}:${visual.hairStyle}:${visual.accessory}`
    })
    expect(new Set(signatures).size).toBe(signatures.length)
  })

  test("defines Coco as the student's companion and tutor", () => {
    expect(CHARACTERS.coco.relationship.toLowerCase()).toContain("compañero")
    expect(CHARACTERS.coco.narrativeFunction.toLowerCase()).toContain("acompañar")
    expect(CHARACTERS.coco.speechStyle.toLowerCase()).toContain("alentador")
  })
})
