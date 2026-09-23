import "server-only"

import { findMission } from "@/shared/lib/curriculum/mission-catalog"
import { generateStructured } from "@/shared/lib/ai/gateway.server"
import type { AiResult } from "@/shared/lib/ai/types"
import type { CourseBand, Mission } from "@/shared/lib/game/types/mission"
import { readProgress } from "@/shared/lib/progress/progress-repository.server"
import type { TutorMessage, TutorReply, TutorRequest } from "../types"

export type { TutorMessage, TutorReply, TutorRequest } from "../types"

const MAX_MESSAGE_LENGTH = 1000
const MAX_HISTORY_MESSAGES = 20

export type TutorServiceErrorCode =
  | "unknown-mission"
  | "course-band-required"

export class TutorServiceError extends Error {
  constructor(public readonly code: TutorServiceErrorCode) {
    super(code)
    this.name = "TutorServiceError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTutorMessage(value: unknown): value is TutorMessage {
  return (
    isRecord(value) &&
    (value.role === "user" || value.role === "assistant") &&
    nonEmptyString(value.content)
  )
}

export function parseTutorRequest(value: unknown): TutorRequest | null {
  if (
    !isRecord(value) ||
    !nonEmptyString(value.message) ||
    value.message.length > MAX_MESSAGE_LENGTH ||
    !nonEmptyString(value.missionSlug) ||
    !Array.isArray(value.history) ||
    value.history.length > MAX_HISTORY_MESSAGES ||
    !value.history.every(isTutorMessage)
  ) {
    return null
  }

  return {
    message: value.message,
    history: value.history,
    missionSlug: value.missionSlug,
  }
}

function parseTutorReply(value: unknown): TutorReply | null {
  if (
    !isRecord(value) ||
    !nonEmptyString(value.explanation) ||
    !isRecord(value.example) ||
    !nonEmptyString(value.example.english) ||
    !nonEmptyString(value.example.spanish) ||
    !(value.curiosity === null || nonEmptyString(value.curiosity))
  ) {
    return null
  }

  let correction: TutorReply["correction"] = null
  if (value.correction !== null) {
    if (
      !isRecord(value.correction) ||
      !nonEmptyString(value.correction.original) ||
      !nonEmptyString(value.correction.corrected) ||
      !nonEmptyString(value.correction.reason)
    ) {
      return null
    }
    correction = {
      original: value.correction.original,
      corrected: value.correction.corrected,
      reason: value.correction.reason,
    }
  }

  return {
    explanation: value.explanation,
    correction,
    example: {
      english: value.example.english,
      spanish: value.example.spanish,
    },
    curiosity: value.curiosity,
  }
}

const tutorSchema = {
  name: "english_tutor_reply",
  strict: true,
  schema: {
    type: "object",
    properties: {
      explanation: { type: "string" },
      correction: {
        anyOf: [
          {
            type: "object",
            properties: {
              original: { type: "string" },
              corrected: { type: "string" },
              reason: { type: "string" },
            },
            required: ["original", "corrected", "reason"],
            additionalProperties: false,
          },
          { type: "null" },
        ],
      },
      example: {
        type: "object",
        properties: {
          english: { type: "string" },
          spanish: { type: "string" },
        },
        required: ["english", "spanish"],
        additionalProperties: false,
      },
      curiosity: { type: ["string", "null"] },
    },
    required: ["explanation", "correction", "example", "curiosity"],
    additionalProperties: false,
  },
}

function tutorInstructions(band: CourseBand, mission: Mission): string {
  const vocabulary = mission.vocab
    .map(([english, spanish]) => `${english} (${spanish})`)
    .join(", ")

  return [
    "Eres Coco, tutora de inglés para estudiantes hispanohablantes.",
    "Responde solo dudas sobre el aprendizaje del inglés. Si el tema no es inglés, redirige con amabilidad a una pregunta de inglés.",
    "Explica en español neutro de Latinoamérica. Incluye siempre un ejemplo en inglés y su traducción al español.",
    "Corrige una frase solo si el estudiante lo pide; incluye original, corrección y motivo breve.",
    "Agrega una curiosidad relacionada solo cuando aporte valor; de lo contrario usa null.",
    `Adapta la explicación al nivel CEFR ${mission.cefrLevel} y a la ruta ${band}.`,
    `Misión actual: ${mission.title}. Vocabulario relacionado: ${vocabulary}.`,
  ].join(" ")
}

export async function askTutor(
  userId: string,
  request: TutorRequest,
): Promise<AiResult<TutorReply>> {
  const mission = findMission(request.missionSlug)
  if (!mission) {
    throw new TutorServiceError("unknown-mission")
  }

  const progress = await readProgress(userId)
  if (!progress.courseBand) {
    throw new TutorServiceError("course-band-required")
  }

  return generateStructured({
    messages: [
      { role: "system", content: tutorInstructions(progress.courseBand, mission) },
      ...request.history,
      { role: "user", content: request.message },
    ],
    schema: tutorSchema,
    parse: parseTutorReply,
  })
}
