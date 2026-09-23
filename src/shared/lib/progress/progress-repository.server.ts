import type { SupabaseClient } from "@supabase/supabase-js"
import { cache } from "react"

import { createSupabaseServerClient } from "../supabase/server"
import {
  toProgress,
  type CoreRow,
  type LooksRow,
  type MissionRow,
  type ProgressRows,
  type ReviewRow,
  type ShopRow,
  type StreakRow,
} from "./progress-mappers"

type QueryResult<T> = { data: T; error: { message: string } | null }

async function ensureRootRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const [coreResult, streakResult, shopResult, looksResult] = await Promise.all([
    supabase.from("progress_core").upsert(
      { user_id: userId, coins: 0, course_band: null },
      { onConflict: "user_id", ignoreDuplicates: true },
    ),
    supabase.from("streak_state").upsert(
      {
        user_id: userId,
        current: 0,
        best: 0,
        last_day: null,
        pending_milestone: null,
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    ),
    supabase.from("shop_state").upsert(
      { user_id: userId, day: null, count: 0 },
      { onConflict: "user_id", ignoreDuplicates: true },
    ),
    supabase.from("looks_state").upsert(
      { user_id: userId, equipped: "classic", owned: [] },
      { onConflict: "user_id", ignoreDuplicates: true },
    ),
  ])

  for (const [table, result] of [
    ["progress_core", coreResult],
    ["streak_state", streakResult],
    ["shop_state", shopResult],
    ["looks_state", looksResult],
  ] as const) {
    const { error } = result
    if (error) {
      throw new Error(`Could not initialize ${table}: ${error.message}`)
    }
  }
}

async function readRoot<T>(
  supabase: SupabaseClient,
  table: string,
  userId: string,
): Promise<T | null> {
  const result = (await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()) as QueryResult<T | null>

  if (result.error) {
    throw new Error(`Could not read ${table}: ${result.error.message}`)
  }

  return result.data
}

async function readCollection<T>(
  supabase: SupabaseClient,
  table: string,
  userId: string,
): Promise<T[]> {
  const result = (await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)) as QueryResult<T[]>

  if (result.error) {
    throw new Error(`Could not read ${table}: ${result.error.message}`)
  }

  return result.data ?? []
}

async function readProgressForUser(userId: string) {
  const supabase = await createSupabaseServerClient()
  await ensureRootRows(supabase, userId)

  const [core, streak, shop, looks, missions, reviews] = await Promise.all([
    readRoot<CoreRow>(supabase, "progress_core", userId),
    readRoot<StreakRow>(supabase, "streak_state", userId),
    readRoot<ShopRow>(supabase, "shop_state", userId),
    readRoot<LooksRow>(supabase, "looks_state", userId),
    readCollection<MissionRow>(supabase, "mission_progress", userId),
    readCollection<ReviewRow>(supabase, "review_cards", userId),
  ])

  const rows: ProgressRows = {
    core,
    streak,
    shop,
    looks,
    missions,
    reviews,
  }

  return toProgress(rows)
}

export const readProgress = cache(readProgressForUser)
