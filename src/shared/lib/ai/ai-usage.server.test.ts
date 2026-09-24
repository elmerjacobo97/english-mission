import { beforeEach, describe, expect, test, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}))

import { createSupabaseServerClient } from "@/shared/lib/supabase/server"
import { getAiQuota, recordAiGeneration } from "./ai-usage.server"

function query(result: unknown) {
  const builder = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    select: vi.fn(),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  return builder
}

beforeEach(() => vi.clearAllMocks())

describe("ai usage", () => {
  test("returns full quota when no row exists", async () => {
    const usageQuery = query({ data: null, error: null })
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(usageQuery),
    } as never)

    await expect(getAiQuota("user-1")).resolves.toEqual({
      used: 0,
      remaining: 50,
    })
    expect(usageQuery.eq).toHaveBeenCalledWith("user_id", "user-1")
  })

  test("counts only usage from current UTC day", async () => {
    const usageQuery = query({
      data: {
        usage_day: "2000-01-01",
        successful_responses: 50,
      },
      error: null,
    })
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(usageQuery),
    } as never)

    await expect(getAiQuota("user-1")).resolves.toEqual({
      used: 0,
      remaining: 50,
    })
  })

  test("returns remaining quota for current UTC day", async () => {
    const usageQuery = query({
      data: {
        usage_day: new Date().toISOString().slice(0, 10),
        successful_responses: 12,
      },
      error: null,
    })
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(usageQuery),
    } as never)

    await expect(getAiQuota("user-1")).resolves.toEqual({
      used: 12,
      remaining: 38,
    })
  })

  test("records successful responses atomically and reports full quota", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null })
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never)

    await expect(recordAiGeneration()).resolves.toBe(false)
    expect(rpc).toHaveBeenCalledWith("record_ai_response")
  })

})
