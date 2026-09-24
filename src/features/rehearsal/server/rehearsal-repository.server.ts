import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { createSupabaseServerClient } from "@/shared/lib/supabase/server"
import {
  parseRehearsalSession,
  type RehearsalSession,
  type RehearsalSessionInput,
  type RehearsalSessionPatch,
} from "../types"

type QueryResult<T> = {
  data: T
  error: { message: string } | null
}

type RehearsalSessionRow = {
  id: string
  user_id: string
  situation: string
  objective: string
  character_role: string
  course_band: string
  status: string
  messages: unknown
  feedback: unknown
  source_session_id: string | null
  created_at: string
  updated_at: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function invalidSession(): Error {
  return new Error("Stored rehearsal session has an invalid shape")
}

function rowToSession(row: unknown): RehearsalSession {
  if (!isRecord(row)) {
    throw invalidSession()
  }

  const session = parseRehearsalSession({
    id: row.id,
    userId: row.user_id,
    situation: row.situation,
    objective: row.objective,
    characterRole: row.character_role,
    courseBand: row.course_band,
    status: row.status,
    messages: row.messages,
    feedback: row.feedback,
    sourceSessionId: row.source_session_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })

  if (!session) {
    throw invalidSession()
  }

  return session
}

function databaseError(operation: string, error: { message: string }): Error {
  return new Error(`Could not ${operation}: ${error.message}`)
}

async function listSessions(
  supabase: SupabaseClient,
  userId: string,
): Promise<RehearsalSession[]> {
  const result = (await supabase
    .from("rehearsal_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })) as unknown as QueryResult<
    RehearsalSessionRow[]
  >

  if (result.error) {
    throw databaseError("list rehearsal sessions", result.error)
  }

  return (result.data ?? []).map(rowToSession)
}

async function findSession(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<RehearsalSession | null> {
  const result = (await supabase
    .from("rehearsal_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle()) as unknown as QueryResult<RehearsalSessionRow | null>

  if (result.error) {
    throw databaseError("find rehearsal session", result.error)
  }

  return result.data ? rowToSession(result.data) : null
}

async function createSession(
  supabase: SupabaseClient,
  userId: string,
  input: RehearsalSessionInput,
): Promise<RehearsalSession> {
  const result = (await supabase
    .from("rehearsal_sessions")
    .insert({
      user_id: userId,
      situation: input.situation,
      objective: input.objective,
      character_role: input.characterRole,
      course_band: input.courseBand,
      messages: input.messages,
      source_session_id: input.sourceSessionId,
    })
    .select("*")
    .single()) as unknown as QueryResult<RehearsalSessionRow>

  if (result.error) {
    throw databaseError("create rehearsal session", result.error)
  }

  return rowToSession(result.data)
}

async function updateSession(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  patch: RehearsalSessionPatch,
  expectedUpdatedAt?: string,
): Promise<RehearsalSession | null> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (patch.status !== undefined) payload.status = patch.status
  if (patch.messages !== undefined) payload.messages = patch.messages
  if (patch.feedback !== undefined) payload.feedback = patch.feedback

  let query = supabase
    .from("rehearsal_sessions")
    .update(payload)
    .eq("user_id", userId)
    .eq("id", id)

  if (expectedUpdatedAt !== undefined) {
    query = query.eq("updated_at", expectedUpdatedAt)
  }

  const result = (await query
    .select("*")
    .maybeSingle()) as unknown as QueryResult<RehearsalSessionRow | null>

  if (result.error) {
    throw databaseError("update rehearsal session", result.error)
  }

  return result.data ? rowToSession(result.data) : null
}

async function removeSession(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<boolean> {
  const result = (await supabase
    .from("rehearsal_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("id", id)
    .select("id")) as unknown as QueryResult<{ id: string }[]>

  if (result.error) {
    throw databaseError("delete rehearsal session", result.error)
  }

  return (result.data ?? []).length > 0
}

export type RehearsalRepository = {
  list: (userId: string) => Promise<RehearsalSession[]>
  find: (userId: string, id: string) => Promise<RehearsalSession | null>
  create: (
    userId: string,
    input: RehearsalSessionInput,
  ) => Promise<RehearsalSession>
  update: (
    userId: string,
    id: string,
    patch: RehearsalSessionPatch,
    expectedUpdatedAt?: string,
  ) => Promise<RehearsalSession | null>
  remove: (userId: string, id: string) => Promise<boolean>
}

export async function createRehearsalRepository(): Promise<RehearsalRepository> {
  const supabase = await createSupabaseServerClient()

  return {
    list: (userId) => listSessions(supabase, userId),
    find: (userId, id) => findSession(supabase, userId, id),
    create: (userId, input) => createSession(supabase, userId, input),
    update: (userId, id, patch, expectedUpdatedAt) =>
      updateSession(supabase, userId, id, patch, expectedUpdatedAt),
    remove: (userId, id) => removeSession(supabase, userId, id),
  }
}
