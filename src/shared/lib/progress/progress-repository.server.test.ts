import { beforeEach, describe, expect, test, vi } from "vitest"
import { createSupabaseServerClient } from "../supabase/server"
import { readProgress } from "./progress-repository.server"

vi.mock("../supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}))

type MockTable = {
  upsert: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
}

function rootTable(data: unknown): MockTable {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null })
  const eq = vi.fn().mockReturnValue({ maybeSingle })

  return {
    upsert: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockReturnValue({ eq }),
  }
}

function collectionTable(data: unknown[]): MockTable {
  const eq = vi.fn().mockResolvedValue({ data, error: null })

  return {
    upsert: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockReturnValue({ eq }),
  }
}

function mockClient(rows: Record<string, MockTable>) {
  const client = {
    from: vi.fn((table: string) => rows[table]),
  }
  vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never)
  return client
}

describe("readProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("initializes root rows without overwriting existing data", async () => {
    const tables = {
      progress_core: rootTable({ coins: 42 }),
      streak_state: rootTable({
        current: 4,
        best: 8,
        last_day: "2026-09-18",
        pending_milestone: 7,
      }),
      shop_state: rootTable({ day: "2026-09-18", count: 2 }),
      looks_state: rootTable({ owned: ["ocean"], equipped: "ocean" }),
      mission_progress: collectionTable([]),
      review_cards: collectionTable([]),
    }
    const client = mockClient(tables)

    await expect(readProgress("user-1")).resolves.toMatchObject({
      coins: 42,
      streak: { current: 4, best: 8 },
      shop: { day: "2026-09-18", count: 2 },
      looks: { owned: ["ocean"], equipped: "ocean" },
    })

    expect(client.from).toHaveBeenCalledTimes(10)
    expect(tables.progress_core.upsert).toHaveBeenCalledWith(
      { user_id: "user-1", coins: 0, course_band: null },
      { onConflict: "user_id", ignoreDuplicates: true },
    )
    expect(tables.streak_state.upsert).toHaveBeenCalled()
    expect(tables.shop_state.upsert).toHaveBeenCalled()
    expect(tables.looks_state.upsert).toHaveBeenCalled()
  })

  test("returns empty progress when all rows are absent", async () => {
    const tables = {
      progress_core: rootTable(null),
      streak_state: rootTable(null),
      shop_state: rootTable(null),
      looks_state: rootTable(null),
      mission_progress: collectionTable([]),
      review_cards: collectionTable([]),
    }
    mockClient(tables)

    await expect(readProgress("user-2")).resolves.toMatchObject({
      version: 8,
      courseBand: null,
      coins: 0,
      missions: {},
      reviews: {},
      streak: { current: 0, best: 0 },
      shop: { day: null, count: 0 },
      looks: { owned: [], equipped: "classic" },
    })
  })

  test("throws when initialization fails", async () => {
    const tables = {
      progress_core: rootTable({ coins: 0 }),
      streak_state: rootTable({}),
      shop_state: rootTable({}),
      looks_state: rootTable({}),
      mission_progress: collectionTable([]),
      review_cards: collectionTable([]),
    }
    tables.progress_core.upsert.mockResolvedValueOnce({
      error: { message: "permission denied" },
    })
    mockClient(tables)

    await expect(readProgress("user-3")).rejects.toThrow(
      "Could not initialize progress_core: permission denied",
    )
  })
})
