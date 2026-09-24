import "server-only"

import { getAiQuota, recordAiGeneration } from "@/shared/lib/ai/ai-usage.server"
import { readProgress } from "@/shared/lib/progress/progress-repository.server"
import {
  countUserReplies,
  hasPendingReply,
  MAX_USER_REPLIES,
  type RehearsalFeedback,
  type RehearsalMessage,
  type RehearsalMessageKind,
  type RehearsalSession,
  type RehearsalSessionPatch,
} from "../types"
import {
  createRehearsalRepository,
  type RehearsalRepository,
} from "./rehearsal-repository.server"
import {
  continueRehearsal,
  evaluateRehearsal,
  prepareScenario,
  suggestHint,
} from "./rehearsal-service.server"

export type RehearsalActionErrorCode =
  | "course-band-required"
  | "not-found"
  | "invalid-status"
  | "turn-limit"
  | "pending-generation"
  | "no-pending-generation"
  | "conflict"
  | "daily-limit"
  | "ai-unavailable"

export class RehearsalActionError extends Error {
  constructor(
    public readonly code: RehearsalActionErrorCode,
    public readonly session: RehearsalSession | null = null,
  ) {
    super(code)
    this.name = "RehearsalActionError"
  }
}

const INSUFFICIENT_EVIDENCE: RehearsalFeedback = {
  outcome: "insufficient_evidence",
  explanation:
    "Todavía no hay respuestas suficientes para evaluar el ensayo. Responde al personaje y vuelve a intentarlo.",
  corrections: [],
}

const MAX_SITUATION_LENGTH = 500
const MAX_OBJECTIVE_LENGTH = 500
const MAX_REPLY_LENGTH = 1000

export type RehearsalAction = "start" | "reply" | "retry" | "hint" | "finish"

export type RehearsalActionInput =
  | { action: "start" | "retry" | "hint" | "finish" }
  | { action: "reply"; content: string }

export type CreateRehearsalInput =
  | { kind: "new"; situation: string; objective: string }
  | { kind: "repeat"; sourceSessionId: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isBoundedText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  )
}

export function parseCreateRehearsalInput(
  value: unknown,
): CreateRehearsalInput | null {
  if (!isRecord(value)) {
    return null
  }

  if (value.sourceSessionId !== undefined) {
    return isBoundedText(value.sourceSessionId, 64)
      ? { kind: "repeat", sourceSessionId: value.sourceSessionId }
      : null
  }

  if (
    !isBoundedText(value.situation, MAX_SITUATION_LENGTH) ||
    !isBoundedText(value.objective, MAX_OBJECTIVE_LENGTH)
  ) {
    return null
  }

  return {
    kind: "new",
    situation: value.situation.trim(),
    objective: value.objective.trim(),
  }
}

export function parseRehearsalActionInput(
  value: unknown,
): RehearsalActionInput | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    value.action === "start" ||
    value.action === "retry" ||
    value.action === "hint" ||
    value.action === "finish"
  ) {
    return { action: value.action }
  }

  if (value.action === "reply" && isBoundedText(value.content, MAX_REPLY_LENGTH)) {
    return { action: "reply", content: value.content.trim() }
  }

  return null
}

function message(kind: RehearsalMessageKind, content: string): RehearsalMessage {
  return { id: crypto.randomUUID(), kind, content }
}

async function requireQuota(
  userId: string,
  session: RehearsalSession | null = null,
): Promise<void> {
  const quota = await getAiQuota(userId)
  if (quota.remaining <= 0) {
    throw new RehearsalActionError("daily-limit", session)
  }
}

// Charge only persisted results. This is not atomic with persistence:
// concurrent requests and ignored counter failures can exceed the daily cap.
// TODO: commit the result and quota together, keyed by a stable operation ID.
async function chargeAfterPersist(): Promise<void> {
  await recordAiGeneration().catch(() => undefined)
}

async function save(
  repository: RehearsalRepository,
  userId: string,
  session: RehearsalSession,
  patch: RehearsalSessionPatch,
): Promise<RehearsalSession> {
  const updated = await repository.update(
    userId,
    session.id,
    patch,
    session.updatedAt,
  )
  if (updated) {
    return updated
  }

  throw new RehearsalActionError(
    "conflict",
    await repository.find(userId, session.id),
  )
}

async function advance(
  repository: RehearsalRepository,
  userId: string,
  session: RehearsalSession,
  evaluate: boolean,
): Promise<RehearsalSession> {
  await requireQuota(userId, session)

  if (evaluate) {
    const result = await evaluateRehearsal(session)
    if (!result.ok) {
      throw new RehearsalActionError("ai-unavailable", session)
    }

    const completed = await save(repository, userId, session, {
      feedback: result.value,
      status: "completed",
    })
    await chargeAfterPersist()
    return completed
  }

  const result = await continueRehearsal(session)
  if (!result.ok) {
    throw new RehearsalActionError("ai-unavailable", session)
  }

  const advanced = await save(repository, userId, session, {
    messages: [...session.messages, message("character_reply", result.value)],
  })
  await chargeAfterPersist()
  return advanced
}

export async function createRehearsal(
  userId: string,
  input: CreateRehearsalInput,
): Promise<RehearsalSession> {
  const progress = await readProgress(userId)
  if (!progress.courseBand) {
    throw new RehearsalActionError("course-band-required")
  }

  const repository = await createRehearsalRepository()
  let situation: string
  let objective: string
  let variationOf: { characterRole: string } | undefined
  let sourceSessionId: string | null = null

  if (input.kind === "repeat") {
    const source = await repository.find(userId, input.sourceSessionId)
    if (!source) {
      throw new RehearsalActionError("not-found")
    }
    if (source.status !== "completed") {
      throw new RehearsalActionError("invalid-status", source)
    }

    situation = source.situation
    objective = source.objective
    variationOf = { characterRole: source.characterRole }
    sourceSessionId = source.id
  } else {
    situation = input.situation
    objective = input.objective
  }

  await requireQuota(userId)

  const scenario = await prepareScenario({
    situation,
    objective,
    courseBand: progress.courseBand,
    ...(variationOf ? { variationOf } : {}),
  })
  if (!scenario.ok) {
    throw new RehearsalActionError("ai-unavailable")
  }

  const created = await repository.create(userId, {
    situation,
    objective: scenario.value.objective,
    characterRole: scenario.value.characterRole,
    courseBand: progress.courseBand,
    messages: [message("character_reply", scenario.value.openingMessage)],
    sourceSessionId,
  })
  await chargeAfterPersist()
  return created
}

export async function startRehearsal(
  userId: string,
  id: string,
): Promise<RehearsalSession> {
  const repository = await createRehearsalRepository()
  const session = await repository.find(userId, id)
  if (!session) {
    throw new RehearsalActionError("not-found")
  }

  if (session.status === "in_progress") {
    return session
  }
  if (session.status === "completed") {
    throw new RehearsalActionError("invalid-status", session)
  }

  return save(repository, userId, session, { status: "in_progress" })
}

export async function sendReply(
  userId: string,
  id: string,
  content: string,
): Promise<RehearsalSession> {
  const repository = await createRehearsalRepository()
  const session = await repository.find(userId, id)
  if (!session) {
    throw new RehearsalActionError("not-found")
  }
  if (session.status !== "in_progress") {
    throw new RehearsalActionError("invalid-status", session)
  }
  if (hasPendingReply(session)) {
    throw new RehearsalActionError("pending-generation", session)
  }
  if (countUserReplies(session.messages) >= MAX_USER_REPLIES) {
    throw new RehearsalActionError("turn-limit", session)
  }

  const withReply = await save(repository, userId, session, {
    messages: [...session.messages, message("user_reply", content)],
  })

  return advance(
    repository,
    userId,
    withReply,
    countUserReplies(withReply.messages) >= MAX_USER_REPLIES,
  )
}

export async function retryGeneration(
  userId: string,
  id: string,
): Promise<RehearsalSession> {
  const repository = await createRehearsalRepository()
  const session = await repository.find(userId, id)
  if (!session) {
    throw new RehearsalActionError("not-found")
  }
  if (session.status !== "in_progress") {
    throw new RehearsalActionError("invalid-status", session)
  }
  if (!hasPendingReply(session)) {
    throw new RehearsalActionError("no-pending-generation", session)
  }

  return advance(
    repository,
    userId,
    session,
    countUserReplies(session.messages) >= MAX_USER_REPLIES,
  )
}

export async function requestHint(
  userId: string,
  id: string,
): Promise<RehearsalSession> {
  const repository = await createRehearsalRepository()
  const session = await repository.find(userId, id)
  if (!session) {
    throw new RehearsalActionError("not-found")
  }
  if (session.status !== "in_progress") {
    throw new RehearsalActionError("invalid-status", session)
  }

  await requireQuota(userId, session)

  const result = await suggestHint(session)
  if (!result.ok) {
    throw new RehearsalActionError("ai-unavailable", session)
  }

  const saved = await save(repository, userId, session, {
    messages: [
      ...session.messages,
      message("hint", `${result.value.spanish}\n${result.value.english}`),
    ],
  })
  await chargeAfterPersist()
  return saved
}

export async function finishRehearsal(
  userId: string,
  id: string,
): Promise<RehearsalSession> {
  const repository = await createRehearsalRepository()
  const session = await repository.find(userId, id)
  if (!session) {
    throw new RehearsalActionError("not-found")
  }
  if (session.status !== "in_progress") {
    throw new RehearsalActionError("invalid-status", session)
  }

  if (countUserReplies(session.messages) === 0) {
    return save(repository, userId, session, {
      feedback: INSUFFICIENT_EVIDENCE,
      status: "completed",
    })
  }

  return advance(repository, userId, session, true)
}
