import { describe, expect, test } from "vitest"
import {
  corePayload,
  emptyProgress,
  looksPayload,
  missionPayload,
  reviewPayload,
  shopPayload,
  streakPayload,
  toProgress,
} from "./progress-mappers"

const completeRows = {
  core: { coins: 42, course_band: "intermediate" as const, updated_at: "2026-09-18T12:00:00.000Z" },
  streak: {
    current: 4,
    best: 8,
    last_day: "2026-09-18",
    pending_milestone: 7,
  },
  shop: { day: "2026-09-18", count: 2 },
  looks: { owned: ["ocean", "party"], equipped: "party" },
  missions: [
    { slug: "arrival", completed: true, stars: 3, best_coins: 45 },
  ],
  reviews: [
    {
      word_key: "hello",
      box: 2,
      due_at: 1_000,
      last_reviewed_at: 900,
    },
  ],
}

describe("toProgress", () => {
  test("reconstructs complete progress from database rows", () => {
    expect(toProgress(completeRows)).toEqual({
      version: 8,
      courseBand: "intermediate",
      coins: 42,
      missions: {
        arrival: { completed: true, stars: 3, bestCoins: 45 },
      },
      reviews: {
        hello: { box: 2, dueAt: 1_000, lastReviewedAt: 900 },
      },
      streak: {
        current: 4,
        best: 8,
        lastDay: "2026-09-18",
        pendingMilestone: 7,
        freezes: 0,
        pendingFreezesUsed: 0,
      },
      shop: { day: "2026-09-18", count: 2 },
      looks: { owned: ["ocean", "party"], equipped: "party" },
    })
  })

  test("uses defaults when rows are null", () => {
    expect(
      toProgress({
        core: null,
        streak: null,
        shop: null,
        looks: null,
        missions: null,
        reviews: null,
      }),
    ).toEqual(emptyProgress)
  })

  test("reads missing freeze columns as zero and keeps stored counts", () => {
    expect(toProgress(completeRows).streak).toMatchObject({
      freezes: 0,
      pendingFreezesUsed: 0,
    })
    expect(
      toProgress({
        ...completeRows,
        streak: { ...completeRows.streak, freezes: 2, pending_freezes_used: 1 },
      }).streak,
    ).toMatchObject({ freezes: 2, pendingFreezesUsed: 1 })
  })

  test("keeps legacy core rows without a course band and rejects unknown bands", () => {
    expect(toProgress({ ...completeRows, core: { coins: 12 } }).courseBand).toBeNull()
    expect(
      toProgress({ ...completeRows, core: { coins: 12, course_band: "expert" as never } }),
    ).toMatchObject({ coins: 12, courseBand: null })
  })

  test("drops corrupt rows and keeps valid sections", () => {
    expect(
      toProgress({
        ...completeRows,
        core: { coins: -1 },
        streak: { ...completeRows.streak, last_day: "not-a-day" },
        shop: { day: "2026-09-18", count: -2 },
        looks: { owned: ["ocean", "ocean"], equipped: "ocean" },
        missions: [
          ...completeRows.missions,
          { slug: "broken", completed: true, stars: 9, best_coins: 0 },
        ],
        reviews: [
          ...completeRows.reviews,
          {
            word_key: " Hello ",
            box: 1,
            due_at: 2_000,
            last_reviewed_at: null,
          },
        ],
      }),
    ).toEqual({
      ...emptyProgress,
      coins: 0,
      missions: {
        arrival: { completed: true, stars: 3, bestCoins: 45 },
      },
      reviews: {
        hello: { box: 2, dueAt: 1_000, lastReviewedAt: 900 },
      },
    })
  })
})

describe("payload mappers", () => {
  test("maps each section to absolute database values", () => {
    const streak = completeRows.streak
    const shop = completeRows.shop
    const looks = completeRows.looks
    const mission = completeRows.missions[0]
    const review = completeRows.reviews[0]

    expect(corePayload(42, "intermediate", "fixed")).toEqual({
      coins: 42,
      course_band: "intermediate",
      updated_at: "fixed",
    })
    expect(streakPayload({
      current: streak.current,
      best: streak.best,
      lastDay: streak.last_day,
      pendingMilestone: 7,
      freezes: 2,
      pendingFreezesUsed: 1,
    })).toEqual({
      ...streak,
      freezes: 2,
      pending_freezes_used: 1,
    })
    expect(shopPayload({ day: shop.day, count: shop.count })).toEqual(shop)
    expect(looksPayload({ owned: ["ocean", "party"], equipped: "party" })).toEqual(looks)
    expect(
      missionPayload("arrival", {
        completed: mission.completed,
        stars: 3,
        bestCoins: 45,
      }),
    ).toEqual(mission)
    expect(
      reviewPayload("hello", {
        box: 2,
        dueAt: 1_000,
        lastReviewedAt: 900,
      }),
    ).toEqual(review)
  })
})
