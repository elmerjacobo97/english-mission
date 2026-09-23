import { beforeEach, describe, expect, test, vi } from "vitest"
import { DAY_MS } from "@/shared/lib/review/schedule"
import * as progressSync from "./progress-sync"
import {
  addCoins,
  clearPendingMilestone,
  emptyProgress,
  getMissionProgress,
  getProgressSnapshot,
  initProgress,
  recordMissionResult,
  recordRecharge,
  recordReviewResult,
  registerDailyActivity,
  resetProgress,
  selectLook,
  setCourseBand,
  spendCoins,
} from "./progress-store"

const mockedEnqueue = vi.spyOn(progressSync, "enqueue")
const NOW = 1_000_000_000_000

function day(year: number, month: number, dayOfMonth: number): number {
  return new Date(year, month - 1, dayOfMonth, 12).getTime()
}

function startWithProgress(progress = emptyProgress): void {
  initProgress(progress, "user-1")
  mockedEnqueue.mockClear()
}

function queuedTables(): string[] {
  return mockedEnqueue.mock.calls.map(([operation]) => operation.table)
}

beforeEach(() => {
  initProgress(emptyProgress, "")
  mockedEnqueue.mockClear()
})

describe("initialization", () => {
  test("uses empty progress until server data initializes the store", () => {
    expect(getProgressSnapshot()).toEqual(emptyProgress)

    const serverProgress = {
      ...emptyProgress,
      coins: 42,
      missions: {
        supermarket: { completed: true, stars: 2 as const, bestCoins: 20 },
      },
    }
    initProgress(serverProgress, "user-1")

    expect(getProgressSnapshot()).toEqual(serverProgress)
  })
})

describe("coins", () => {
  test("adds and spends and syncs core", () => {
    startWithProgress()

    addCoins(20)
    expect(getProgressSnapshot().coins).toBe(20)
    expect(queuedTables()).toEqual(["progress_core"])
    expect(mockedEnqueue.mock.calls[0][0]).toMatchObject({
      action: "upsert",
      table: "progress_core",
      payload: { user_id: "user-1", coins: 20 },
    })

    expect(spendCoins(5)).toBe(true)
    expect(getProgressSnapshot().coins).toBe(15)
    expect(spendCoins(50)).toBe(false)
    expect(getProgressSnapshot().coins).toBe(15)
  })
})

describe("course band", () => {
  test("selects a route and saves it in the core row", () => {
    startWithProgress()

    setCourseBand("intermediate")

    expect(getProgressSnapshot().courseBand).toBe("intermediate")
    expect(mockedEnqueue.mock.calls[0][0]).toMatchObject({
      action: "upsert",
      table: "progress_core",
      payload: { user_id: "user-1", coins: 0, course_band: "intermediate" },
    })
  })
})

describe("recordMissionResult", () => {
  test("marks completed, keeps best values and syncs core plus mission", () => {
    startWithProgress()

    recordMissionResult("supermarket", {
      stars: 2,
      payout: 20,
      bestCoins: 20,
    })
    expect(getMissionProgress("supermarket")).toEqual({
      completed: true,
      stars: 2,
      bestCoins: 20,
    })
    expect(getProgressSnapshot().coins).toBe(20)
    expect(queuedTables()).toEqual(["progress_core", "mission_progress"])

    mockedEnqueue.mockClear()
    recordMissionResult("supermarket", {
      stars: 1,
      payout: 0,
      bestCoins: 10,
    })
    expect(getMissionProgress("supermarket")).toEqual({
      completed: true,
      stars: 2,
      bestCoins: 20,
    })
    expect(getProgressSnapshot().coins).toBe(20)
    expect(queuedTables()).toEqual(["progress_core", "mission_progress"])
  })

  test("reports default progress for unknown missions", () => {
    expect(getMissionProgress("nope")).toEqual({
      completed: false,
      stars: 0,
      bestCoins: 0,
    })
  })
})

describe("recordReviewResult", () => {
  test("creates and promotes a card and syncs one row", () => {
    startWithProgress()

    recordReviewResult("apple", true, NOW)
    expect(getProgressSnapshot().reviews.apple).toEqual({
      box: 2,
      dueAt: NOW + 3 * DAY_MS,
      lastReviewedAt: NOW,
    })
    expect(queuedTables()).toEqual(["review_cards"])

    recordReviewResult("apple", true, NOW + 1)
    expect(getProgressSnapshot().reviews.apple?.box).toBe(3)
    recordReviewResult("apple", false, NOW + 2)
    expect(getProgressSnapshot().reviews.apple).toEqual({
      box: 1,
      dueAt: NOW + 2 + DAY_MS,
      lastReviewedAt: NOW + 2,
    })
  })
})

describe("selectLook", () => {
  test("buys ocean with core and looks payloads", () => {
    startWithProgress()
    addCoins(25)
    mockedEnqueue.mockClear()

    expect(selectLook("ocean")).toBe(true)
    expect(getProgressSnapshot()).toMatchObject({
      coins: 0,
      looks: { owned: ["ocean"], equipped: "ocean" },
    })
    expect(queuedTables()).toEqual(["looks_state", "progress_core"])
  })

  test("re-equips classic without changing balance and syncs looks only", () => {
    startWithProgress()
    addCoins(25)
    selectLook("ocean")
    addCoins(10)
    mockedEnqueue.mockClear()

    expect(selectLook("classic")).toBe(true)
    expect(getProgressSnapshot()).toMatchObject({
      coins: 10,
      looks: { owned: ["ocean"], equipped: "classic" },
    })
    expect(queuedTables()).toEqual(["looks_state"])
  })

  test("does not mutate when balance is short", () => {
    startWithProgress()
    addCoins(25)
    mockedEnqueue.mockClear()
    const before = getProgressSnapshot()

    expect(selectLook("party")).toBe(false)
    expect(getProgressSnapshot()).toBe(before)
    expect(mockedEnqueue).not.toHaveBeenCalled()
  })
})

describe("recordRecharge", () => {
  test("adds payout and syncs shop plus core", () => {
    startWithProgress()

    expect(recordRecharge(10, day(2026, 9, 18))).toBe(true)
    expect(getProgressSnapshot().coins).toBe(10)
    expect(getProgressSnapshot().shop).toEqual({ day: "2026-09-18", count: 1 })
    expect(queuedTables()).toEqual(["shop_state", "progress_core"])
  })

  test("blocks a fourth recharge without mutation", () => {
    startWithProgress()
    recordRecharge(10, day(2026, 9, 18))
    recordRecharge(10, day(2026, 9, 18))
    recordRecharge(10, day(2026, 9, 18))
    mockedEnqueue.mockClear()
    const before = getProgressSnapshot()

    expect(recordRecharge(10, day(2026, 9, 18))).toBe(false)
    expect(getProgressSnapshot()).toBe(before)
    expect(mockedEnqueue).not.toHaveBeenCalled()
  })

  test("restores quota on a new day", () => {
    startWithProgress()
    recordRecharge(10, day(2026, 9, 18))
    recordRecharge(10, day(2026, 9, 18))
    recordRecharge(10, day(2026, 9, 18))

    expect(recordRecharge(10, day(2026, 9, 19))).toBe(true)
    expect(getProgressSnapshot().shop).toEqual({ day: "2026-09-19", count: 1 })
  })
})

describe("registerDailyActivity", () => {
  test("starts streak and syncs streak plus core", () => {
    startWithProgress()

    registerDailyActivity(day(2026, 9, 10))
    expect(getProgressSnapshot().streak).toEqual({
      current: 1,
      best: 1,
      lastDay: "2026-09-10",
      pendingMilestone: null,
    })
    expect(queuedTables()).toEqual(["streak_state", "progress_core"])
  })

  test("does not mutate when day is already registered", () => {
    startWithProgress()
    registerDailyActivity(day(2026, 9, 10))
    mockedEnqueue.mockClear()
    const before = getProgressSnapshot()

    registerDailyActivity(day(2026, 9, 10))

    expect(getProgressSnapshot()).toBe(before)
    expect(mockedEnqueue).not.toHaveBeenCalled()
  })

  test("pays milestone once and clears its notice", () => {
    startWithProgress()
    registerDailyActivity(day(2026, 9, 10))
    registerDailyActivity(day(2026, 9, 11))
    registerDailyActivity(day(2026, 9, 12))

    expect(getProgressSnapshot().streak.pendingMilestone).toBe(3)
    expect(getProgressSnapshot().coins).toBe(10)

    registerDailyActivity(day(2026, 9, 12))
    expect(getProgressSnapshot().coins).toBe(10)
    clearPendingMilestone()
    expect(getProgressSnapshot().streak.pendingMilestone).toBeNull()
  })
})

describe("resetProgress", () => {
  test("clears game data, keeps the chosen route and saves a zeroed core row", () => {
    startWithProgress()
    setCourseBand("advanced")
    addCoins(25)
    mockedEnqueue.mockClear()

    resetProgress()

    expect(getProgressSnapshot()).toEqual({ ...emptyProgress, courseBand: "advanced" })
    expect(queuedTables()).toEqual([
      "streak_state",
      "shop_state",
      "looks_state",
      "mission_progress",
      "review_cards",
      "progress_core",
    ])
    expect(mockedEnqueue.mock.calls[5]?.[0]).toEqual({
      action: "upsert",
      table: "progress_core",
      payload: { user_id: "user-1", coins: 0, course_band: "advanced", updated_at: expect.any(String) },
    })
  })
})
