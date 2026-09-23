import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { missionPlan } from "./plan"
import { missions, findPlanEntry } from "./mission-catalog"
import {
  findSpainisms,
  introducedVocab,
  missionCharacters,
  missionContentWords,
  missionNotes,
  missionSpanishText,
  orphanVocab,
  orphanStoryVocab,
  recycledWords,
} from "./curriculum"
import { profileFor } from "@/shared/lib/game/utils/difficulty"
import type { Mission } from "@/shared/lib/game/types/mission"

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

  test("keeps each story vocabulary entry inside its own English dialogue", () => {
    for (const mission of missions) {
      expect(orphanStoryVocab(mission), mission.slug).toEqual([])
    }
  })

  test("rejects a story term that only appears inside another word", () => {
    const mission = {
      slug: "fixture",
      order: 1,
      title: "Prueba",
      subtitle: "Prueba",
      emoji: "🧪",
      chapter: 1,
      band: "basic",
      cefrLevel: "A1",
      level: 1,
      cast: [],
      vocab: [],
      written: true,
      beats: [
        {
          kind: "story",
          es: "Pides fruta.",
          en: "Bananas and apples, please.",
          speaker: "you",
          vocab: [
            ["banana", "plátano"],
            ["apple", "manzana"],
          ],
        },
      ],
    } satisfies Mission

    expect(orphanStoryVocab(mission)).toEqual(["fixture:banana", "fixture:apple"])
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

describe("cast and notes", () => {
  test("declares one Coco tutor and one or two mission characters", () => {
    for (const entry of missionPlan) {
      const tutors = entry.cast.filter((member) => member.function === "tutor")
      const additional = entry.cast.filter((member) => member.function !== "tutor")

      expect(tutors, `${entry.slug} tutors`).toHaveLength(1)
      expect(tutors[0]?.character, entry.slug).toBe("coco")
      expect(additional.length, entry.slug).toBeGreaterThanOrEqual(1)
      expect(additional.length, entry.slug).toBeLessThanOrEqual(2)
      for (const member of entry.cast) {
        expect(["tutor", "primary", "support"], `${entry.slug}:${member.character}`).toContain(member.function)
        expect(member.objective.length, `${entry.slug}:${member.character}`).toBeGreaterThan(0)
      }
    }
  })

  test("includes a playable first mission in every CEFR band", () => {
    expect(missionPlan.filter((entry) => entry.written).map((entry) => entry.slug)).toContain("arrival")
    expect(missionPlan.some((entry) => entry.band === "intermediate" && entry.written)).toBe(true)
    expect(missionPlan.some((entry) => entry.band === "advanced" && entry.written)).toBe(true)
    expect(missionPlan.filter((entry) => !entry.written).map((entry) => entry.order)).toEqual([11, 12])
  })

  test("uses only cast characters and at least two per written mission", () => {
    for (const mission of missions) {
      const used = missionCharacters(mission)
      expect(used.length, mission.slug).toBeGreaterThanOrEqual(2)
      for (const character of used) {
        expect(
          mission.cast.some((member) => member.character === character),
          `${mission.slug}:${character}`,
        ).toBe(true)
      }
    }
  })

  test("declares at least two grammar notes per written mission", () => {
    for (const mission of missions) {
      const notes = missionNotes(mission)
      expect(notes.length, mission.slug).toBeGreaterThanOrEqual(2)
      for (const note of notes) {
        expect(note.title.length, mission.slug).toBeGreaterThan(0)
        expect(note.body.length, mission.slug).toBeGreaterThan(20)
        expect(note.body.length, mission.slug).toBeLessThanOrEqual(280)
      }
    }
  })
})

describe("spanish detector", () => {
  test("flags regionalisms and ignores lookalike words", () => {
    expect(findSpainisms("Entras al mercado y el dependiente te saluda")).toEqual(
      ["dependiente"],
    )
    expect(findSpainisms("La nevera está vacía")).toEqual(["nevera"])
    expect(findSpainisms("Voy a escoger el boleto")).toEqual([])
    expect(findSpainisms("El refrigerador y el vendedor")).toEqual([])
  })
})

describe("neutral Spanish", () => {
  test("keeps regionalisms out of the content", () => {
    for (const mission of missions) {
      const found = findSpainisms(missionSpanishText(mission))
      expect(found, `${mission.slug}: ${found.join(", ")}`).toEqual([])
    }
    for (const entry of missionPlan) {
      const found = findSpainisms(`${entry.title} ${entry.subtitle}`)
      expect(found, `${entry.slug}: ${found.join(", ")}`).toEqual([])
    }
  })

  test("keeps regionalisms out of the source text", () => {
    const root = join(process.cwd(), "src")
    const files = sourceFiles(root).filter(
      (file) =>
        !file.endsWith("curriculum.ts") &&
        !file.endsWith(".test.ts") &&
        !file.endsWith(".test.tsx"),
    )
    for (const file of files) {
      const found = findSpainisms(readFileSync(file, "utf8"))
      expect(found, `${file}: ${found.join(", ")}`).toEqual([])
    }
  })
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      return sourceFiles(full)
    }
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : []
  })
}
