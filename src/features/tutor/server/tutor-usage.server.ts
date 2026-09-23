import "server-only"

import { createSupabaseServerClient } from "@/shared/lib/supabase/server"

const DAILY_TUTOR_LIMIT = 50

type QueryResult<T> = { data: T; error: { message: string } | null }

type UsageRow = { usage_day: string; successful_responses: number }

export type TutorUsage = {
  used: number
  remaining: number
}

export async function getTutorUsage(userId: string): Promise<TutorUsage> {
  const supabase = await createSupabaseServerClient()
  const result = (await supabase
    .from("ai_usage")
    .select("usage_day, successful_responses")
    .eq("user_id", userId)
    .maybeSingle()) as QueryResult<UsageRow | null>

  if (result.error) {
    throw new Error(`Could not read AI usage: ${result.error.message}`)
  }

  const today = new Date().toISOString().slice(0, 10)
  const used = result.data?.usage_day === today
    ? result.data.successful_responses
    : 0

  return { used, remaining: DAILY_TUTOR_LIMIT - used }
}

export async function recordTutorResponse(): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const result = (await supabase.rpc("record_ai_response")) as QueryResult<unknown>

  if (result.error) {
    throw new Error(`Could not record AI usage: ${result.error.message}`)
  }

  if (typeof result.data !== "boolean") {
    throw new Error("AI usage response has an invalid shape")
  }

  return result.data
}
