import type { CourseBand } from "@/shared/lib/game/types/mission"

export type RehearsalMessageKind = "user_reply" | "character_reply" | "hint"

export type RehearsalMessage = {
  id: string
  kind: RehearsalMessageKind
  content: string
}

export type RehearsalOutcome =
  | "achieved"
  | "partially_achieved"
  | "not_achieved"
  | "insufficient_evidence"

export type RehearsalCorrection = {
  original: string
  corrected: string
  reason: string
}

export type RehearsalFeedback = {
  outcome: RehearsalOutcome
  explanation: string
  corrections: RehearsalCorrection[]
}

export type RehearsalStatus = "ready" | "in_progress" | "completed"

export type RehearsalSession = {
  id: string
  userId: string
  situation: string
  objective: string
  characterRole: string
  courseBand: CourseBand
  status: RehearsalStatus
  messages: RehearsalMessage[]
  feedback: RehearsalFeedback | null
  sourceSessionId: string | null
  createdAt: string
  updatedAt: string
}

export type RehearsalSessionInput = {
  situation: string
  objective: string
  characterRole: string
  courseBand: CourseBand
  messages: RehearsalMessage[]
  sourceSessionId: string | null
}

export type RehearsalSessionPatch = {
  status?: RehearsalStatus
  messages?: RehearsalMessage[]
  feedback?: RehearsalFeedback | null
}

export const MAX_USER_REPLIES = 5
export const MAX_CORRECTIONS = 2

export function countUserReplies(messages: RehearsalMessage[]): number {
  return messages.filter((message) => message.kind === "user_reply").length
}

export function lastNonHintMessage(
  messages: RehearsalMessage[],
): RehearsalMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const candidate = messages[index]
    if (candidate.kind !== "hint") {
      return candidate
    }
  }

  return null
}

export function hasPendingReply(session: RehearsalSession): boolean {
  return lastNonHintMessage(session.messages)?.kind === "user_reply"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isCourseBand(value: unknown): value is CourseBand {
  return value === "basic" || value === "intermediate" || value === "advanced"
}

function isRehearsalMessage(value: unknown): value is RehearsalMessage {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isRehearsalMessageKind(value.kind) &&
    isNonEmptyString(value.content)
  )
}

function isRehearsalFeedback(value: unknown): value is RehearsalFeedback {
  if (!isRecord(value)) {
    return false
  }

  const corrections = value.corrections
  return (
    isRehearsalOutcome(value.outcome) &&
    isNonEmptyString(value.explanation) &&
    Array.isArray(corrections) &&
    corrections.length <= MAX_CORRECTIONS &&
    corrections.every(
      (correction) =>
        isRecord(correction) &&
        isNonEmptyString(correction.original) &&
        isNonEmptyString(correction.corrected) &&
        isNonEmptyString(correction.reason),
    )
  )
}

export function parseRehearsalSession(value: unknown): RehearsalSession | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.userId) ||
    !isNonEmptyString(value.situation) ||
    !isNonEmptyString(value.objective) ||
    !isNonEmptyString(value.characterRole) ||
    !isCourseBand(value.courseBand) ||
    !isRehearsalStatus(value.status) ||
    !Array.isArray(value.messages) ||
    !value.messages.every(isRehearsalMessage) ||
    !(value.feedback === null || isRehearsalFeedback(value.feedback)) ||
    !(value.sourceSessionId === null || isNonEmptyString(value.sourceSessionId)) ||
    !isNonEmptyString(value.createdAt) ||
    !isNonEmptyString(value.updatedAt)
  ) {
    return null
  }

  return {
    id: value.id,
    userId: value.userId,
    situation: value.situation,
    objective: value.objective,
    characterRole: value.characterRole,
    courseBand: value.courseBand,
    status: value.status,
    messages: value.messages,
    feedback: value.feedback,
    sourceSessionId: value.sourceSessionId,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

export function isRehearsalOutcome(value: unknown): value is RehearsalOutcome {
  return (
    value === "achieved" ||
    value === "partially_achieved" ||
    value === "not_achieved" ||
    value === "insufficient_evidence"
  )
}

export function isRehearsalStatus(value: unknown): value is RehearsalStatus {
  return value === "ready" || value === "in_progress" || value === "completed"
}

export function isRehearsalMessageKind(
  value: unknown,
): value is RehearsalMessageKind {
  return (
    value === "user_reply" || value === "character_reply" || value === "hint"
  )
}
