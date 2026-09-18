import { describe, expect, test } from "vitest"
import { missionPlan } from "./plan"
import { missions, findPlanEntry } from "./mission-catalog"
import {
  introducedVocab,
  missionContentWords,
  orphanVocab,
  recycledWords,
} from "../utils/curriculum"
import { profileFor } from "../utils/difficulty"

const MIN_RECYCLED_WORDS = 3

describe("mission plan", () => {
  test("has twelve sequential missions with unique slugs", () => {
    expect(missionPlan).toHaveLength(12)
    expect(missionPlan.map((entry) => entry.order)).toEqual(
      Array.from({ length: 12 }, (_, i) => i + 1),
    )
    const slugs = missionPlan.map((entry) => entry.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  test("difficulty never decreases", () => {
    for (let i = 1; i < missionPlan.length; i++) {
      expect(missionPlan[i].level).toBeGreaterThanOrEqual(
        missionPlan[i - 1].level,
      )
      expect(missionPlan[i].chapter).toBeGreaterThanOrEqual(
        missionPlan[i - 1].chapter,
      )
    }
  })

  test("covers three chapters with at least three missions each", () => {
    for (const chapter of [1, 2, 3]) {
      const count = missionPlan.filter((entry) => entry.chapter === chapter).length
      expect(count).toBeGreaterThanOrEqual(3)
    }
  })

  test("declares between six and twelve new words per mission", () => {
    for (const entry of missionPlan) {
      expect(entry.vocab.length).toBeGreaterThanOrEqual(6)
      expect(entry.vocab.length).toBeLessThanOrEqual(12)
    }
  })
})

describe("written missions", () => {
  test("every written plan entry has beats", () => {
    for (const entry of missionPlan.filter((item) => item.written)) {
      const mission = missions.find((item) => item.slug === entry.slug)
      expect(mission, entry.slug).toBeDefined()
      expect(mission?.beats.length ?? 0).toBeGreaterThan(0)
    }
  })

  test("keeps eight to sixteen beats with at least three challenges", () => {
    for (const mission of missions) {
      expect(mission.beats.length, mission.slug).toBeGreaterThanOrEqual(8)
      expect(mission.beats.length, mission.slug).toBeLessThanOrEqual(16)
      const challenges = mission.beats.filter((beat) => beat.kind !== "story")
      expect(challenges.length, mission.slug).toBeGreaterThanOrEqual(3)
    }
  })

  test("uses only challenge kinds allowed by the level", () => {
    for (const mission of missions) {
      const allowed = profileFor(mission.level).challengeKinds
      for (const beat of mission.beats) {
        if (beat.kind === "story") {
          continue
        }
        expect(allowed, `${mission.slug}:${beat.kind}`).toContain(beat.kind)
      }
    }
  })

  test("uses every declared vocabulary word in the English material", () => {
    for (const mission of missions) {
      expect(orphanVocab(mission), mission.slug).toEqual([])
    }
  })

  test("recycles vocabulary from earlier missions", () => {
    for (const mission of missions) {
      if (mission.order === 1) {
        continue
      }
      const previous = introducedVocab(missions, mission.order)
      expect(
        recycledWords(mission, previous).length,
        `${mission.slug} recycles too little`,
      ).toBeGreaterThanOrEqual(MIN_RECYCLED_WORDS)
    }
  })

  test("keeps challenge data well formed", () => {
    for (const mission of missions) {
      for (const beat of mission.beats) {
        switch (beat.kind) {
          case "choice":
          case "listen":
          case "dialogue":
            expect(beat.correct).toBeGreaterThanOrEqual(0)
            expect(beat.correct).toBeLessThan(beat.options.length)
            expect(beat.options.length).toBeGreaterThanOrEqual(2)
            break
          case "order":
            expect([...beat.tokens].sort()).toEqual([...beat.solution].sort())
            break
          case "type":
            expect(beat.accepted.length).toBeGreaterThan(0)
            break
          case "fill":
            expect(beat.sentence).toContain("___")
            expect(beat.answer.length).toBeGreaterThan(0)
            break
          default:
            break
        }
      }
    }
  })

  test("keeps every written mission at its planned level", () => {
    for (const mission of missions) {
      expect(mission.level).toBe(findPlanEntry(mission.slug)?.level)
    }
  })

  test("has English material to teach from", () => {
    for (const mission of missions) {
      expect(missionContentWords(mission).length, mission.slug).toBeGreaterThan(
        10,
      )
    }
  })
})
