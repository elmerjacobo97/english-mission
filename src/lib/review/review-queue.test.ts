import { describe, expect, test } from "vitest"
import { DAY_MS } from "./schedule"
import type { MissionPlanEntry } from "@/features/mission/types/mission"
import type { Progress } from "@/lib/progress/types"
import { buildReviewPool, buildReviewQueue, reviewKey } from "./review-queue"

const NOW = 1_700_000_000_000

function progress(overrides: Partial<Progress> = {}): Progress {
  return {
    version: 6,
    coins: 0,
    missions: {},
    reviews: {},
    streak: { current: 0, best: 0, lastDay: null, pendingMilestone: null },
    shop: { day: null, count: 0 },
    looks: { owned: [], equipped: "classic" },
    ...overrides,
  }
}

function entry(
  slug: string,
  order: number,
  chapter: 1 | 2 | 3,
  vocab: [string, string][],
): MissionPlanEntry {
  return {
    order,
    slug,
    title: slug,
    subtitle: slug,
    emoji: "🧪",
    chapter,
    level: 1,
    cast: [],
    vocab,
    written: true,
  }
}

describe("reviewKey", () => {
  test("trims and lowercases the english word", () => {
    expect(reviewKey("  Nice to Meet You ")).toBe("nice to meet you")
  })
})

describe("buildReviewPool", () => {
  test("only collects words from completed missions", () => {
    const pool = buildReviewPool(
      progress({ missions: { "la-llegada": { completed: false, stars: 0, bestCoins: 0 } } }),
    )
    expect(pool).toEqual([])
  })

  test("collects the eight words of mission 1 once it is completed", () => {
    const pool = buildReviewPool(
      progress({
        missions: { "la-llegada": { completed: true, stars: 1, bestCoins: 0 } },
      }),
    )
    expect(pool).toHaveLength(8)
    expect(pool[0]).toEqual({
      key: "hello",
      en: "hello",
      es: "hola",
      level: 1,
      chapter: 1,
    })
  })

  test("deduplicates a repeated word and keeps the first mission data", () => {
    const entries = [
      entry("uno", 1, 1, [
        ["hello", "hola"],
        ["world", "mundo"],
      ]),
      entry("dos", 2, 2, [[" HELLO ", "hola"]]),
    ]
    const pool = buildReviewPool(
      progress({
        missions: {
          uno: { completed: true, stars: 1, bestCoins: 0 },
          dos: { completed: true, stars: 1, bestCoins: 0 },
        },
      }),
      entries,
    )
    expect(pool).toEqual([
      { key: "hello", en: "hello", es: "hola", level: 1, chapter: 1 },
      { key: "world", en: "world", es: "mundo", level: 1, chapter: 1 },
    ])
  })
})

describe("buildReviewQueue", () => {
  const completed = progress({
    missions: { "la-llegada": { completed: true, stars: 1, bestCoins: 0 } },
  })

  test("words without a card are due now with box 1", () => {
    const queue = buildReviewQueue(completed, NOW)
    expect(queue).toHaveLength(8)
    expect(queue[0]).toMatchObject({ key: "hello", box: 1, dueAt: NOW })
  })

  test("most overdue first", () => {
    const queue = buildReviewQueue(
      progress({
        missions: completed.missions,
        reviews: {
          hello: { box: 2, dueAt: NOW - 2 * DAY_MS, lastReviewedAt: NOW - 10 * DAY_MS },
          goodbye: { box: 1, dueAt: NOW - DAY_MS, lastReviewedAt: NOW - 5 * DAY_MS },
        },
      }),
      NOW,
    )
    expect(queue[0].key).toBe("hello")
    expect(queue[0].box).toBe(2)
    expect(queue[1].key).toBe("goodbye")
  })

  test("cards due in the future stay out of the queue", () => {
    const queue = buildReviewQueue(
      progress({
        missions: completed.missions,
        reviews: {
          hello: { box: 3, dueAt: NOW + DAY_MS, lastReviewedAt: NOW },
        },
      }),
      NOW,
    )
    expect(queue).toHaveLength(7)
    expect(queue.some((word) => word.key === "hello")).toBe(false)
  })

  test("caps the session at ten words", () => {
    const queue = buildReviewQueue(
      progress({
        missions: {
          "la-llegada": { completed: true, stars: 1, bestCoins: 0 },
          supermercado: { completed: true, stars: 1, bestCoins: 0 },
        },
      }),
      NOW,
    )
    expect(queue).toHaveLength(10)
  })

  test("respects a custom limit", () => {
    const queue = buildReviewQueue(completed, NOW, 3)
    expect(queue).toHaveLength(3)
  })
})
