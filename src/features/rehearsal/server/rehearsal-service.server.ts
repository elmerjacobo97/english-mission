import "server-only"

import { generateStructured } from "@/shared/lib/ai/gateway.server"
import type { AiMessage, AiResult } from "@/shared/lib/ai/types"
import type { CourseBand } from "@/shared/lib/game/types/mission"
import {
  isRehearsalOutcome,
  MAX_CORRECTIONS,
  type RehearsalFeedback,
  type RehearsalSession,
} from "../types"

export type RehearsalScenario = {
  characterRole: string
  objective: string
  openingMessage: string
}

export type RehearsalHint = {
  spanish: string
  english: string
}

const BAND_LANGUAGE: Record<CourseBand, string> = {
  basic: "frases cortas, vocabulario cotidiano y tiempos simples",
  intermediate: "frases conectadas, tiempos variados y vocabulario común",
  advanced: "expresiones naturales, matices y vocabulario preciso",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function transcript(session: RehearsalSession): AiMessage[] {
  return session.messages
    .filter((message) => message.kind !== "hint")
    .map((message) => ({
      role: message.kind === "user_reply" ? ("user" as const) : ("assistant" as const),
      content: message.content,
    }))
}

function scenarioInstructions(
  courseBand: CourseBand,
  variationOf?: { characterRole: string },
): string {
  return [
    "Eres Coco, tutora de inglés para estudiantes hispanohablantes.",
    "Vas a preparar un ensayo de conversación en inglés a partir de una situación real descrita por el estudiante.",
    "Todavía no converses: prepara el ensayo y devuelve sus datos.",
    ...(variationOf
      ? [
          `Es una repetición: mantén el objetivo, pero propón un escenario distinto (otro lugar, otro contexto u otro interlocutor). El papel anterior era: ${variationOf.characterRole}.`,
        ]
      : []),
    "characterRole: papel que interpretarás, en español neutro de Latinoamérica, en pocas palabras.",
    "objective: objetivo confirmado, claro y concreto, en español neutro de Latinoamérica.",
    `openingMessage: primera frase en inglés, dicha en personaje, con ${BAND_LANGUAGE[courseBand]}.`,
  ].join(" ")
}

function conversationInstructions(session: RehearsalSession): string {
  return [
    "Eres Coco, tutora de inglés para estudiantes hispanohablantes.",
    "Ahora interpretas un personaje en un ensayo de conversación en inglés. Mantente siempre en personaje.",
    `Situación: ${session.situation}.`,
    `Tu papel: ${session.characterRole}.`,
    `Objetivo del estudiante: ${session.objective}.`,
    `Responde en inglés con ${BAND_LANGUAGE[session.courseBand]}.`,
    "Escribe una o dos frases cortas y termina con algo que invite al estudiante a continuar.",
    "No corrijas errores durante el ensayo: la retroalimentación llega al final.",
  ].join(" ")
}

function hintInstructions(session: RehearsalSession): string {
  return [
    "Eres Coco, tutora de inglés para estudiantes hispanohablantes.",
    "El estudiante pidió una pista durante un ensayo de conversación. No continúes la conversación ni respondas como el personaje.",
    `Situación: ${session.situation}. Tu papel: ${session.characterRole}. Objetivo: ${session.objective}.`,
    "spanish: ayuda breve en español neutro de Latinoamérica que explique qué puede decir y cómo, sin resolver toda la conversación.",
    `english: una frase inicial en inglés que el estudiante pueda usar, con ${BAND_LANGUAGE[session.courseBand]}.`,
  ].join(" ")
}

function feedbackInstructions(session: RehearsalSession): string {
  return [
    "Eres Coco, tutora de inglés para estudiantes hispanohablantes.",
    "Evalúa un ensayo de conversación en inglés que acaba de terminar.",
    `Situación: ${session.situation}. Tu papel: ${session.characterRole}. Objetivo del estudiante: ${session.objective}.`,
    "Basa la evaluación solo en las respuestas del estudiante y cita evidencia concreta de la conversación.",
    "outcome: achieved si logró el objetivo, partially_achieved si lo logró a medias, not_achieved si no lo logró, insufficient_evidence si no hay respuestas suficientes para evaluar.",
    "explanation: explicación breve en español neutro de Latinoamérica.",
    `corrections: máximo ${MAX_CORRECTIONS} correcciones de errores que afectaron la comunicación; cada una con original (frase del estudiante), corrected y reason en español neutro. Usa [] si no hay errores relevantes.`,
    "No presentes el resultado como certificación de nivel CEFR.",
  ].join(" ")
}

const scenarioSchema = {
  name: "english_rehearsal_scenario",
  strict: true,
  schema: {
    type: "object",
    properties: {
      characterRole: { type: "string" },
      objective: { type: "string" },
      openingMessage: { type: "string" },
    },
    required: ["characterRole", "objective", "openingMessage"],
    additionalProperties: false,
  },
}

const replySchema = {
  name: "english_rehearsal_reply",
  strict: true,
  schema: {
    type: "object",
    properties: {
      reply: { type: "string" },
    },
    required: ["reply"],
    additionalProperties: false,
  },
}

const hintSchema = {
  name: "english_rehearsal_hint",
  strict: true,
  schema: {
    type: "object",
    properties: {
      spanish: { type: "string" },
      english: { type: "string" },
    },
    required: ["spanish", "english"],
    additionalProperties: false,
  },
}

const feedbackSchema = {
  name: "english_rehearsal_feedback",
  strict: true,
  schema: {
    type: "object",
    properties: {
      outcome: {
        type: "string",
        enum: [
          "achieved",
          "partially_achieved",
          "not_achieved",
          "insufficient_evidence",
        ],
      },
      explanation: { type: "string" },
      corrections: {
        type: "array",
        maxItems: MAX_CORRECTIONS,
        items: {
          type: "object",
          properties: {
            original: { type: "string" },
            corrected: { type: "string" },
            reason: { type: "string" },
          },
          required: ["original", "corrected", "reason"],
          additionalProperties: false,
        },
      },
    },
    required: ["outcome", "explanation", "corrections"],
    additionalProperties: false,
  },
}

function parseScenario(value: unknown): RehearsalScenario | null {
  if (
    !isRecord(value) ||
    !nonEmptyString(value.characterRole) ||
    !nonEmptyString(value.objective) ||
    !nonEmptyString(value.openingMessage)
  ) {
    return null
  }

  return {
    characterRole: value.characterRole,
    objective: value.objective,
    openingMessage: value.openingMessage,
  }
}

function parseReply(value: unknown): string | null {
  if (!isRecord(value) || !nonEmptyString(value.reply)) {
    return null
  }

  return value.reply
}

function parseHint(value: unknown): RehearsalHint | null {
  if (!isRecord(value) || !nonEmptyString(value.spanish) || !nonEmptyString(value.english)) {
    return null
  }

  return { spanish: value.spanish, english: value.english }
}

function parseFeedback(value: unknown): RehearsalFeedback | null {
  if (
    !isRecord(value) ||
    !isRehearsalOutcome(value.outcome) ||
    !nonEmptyString(value.explanation) ||
    !Array.isArray(value.corrections)
  ) {
    return null
  }

  const corrections: RehearsalFeedback["corrections"] = []
  for (const correction of value.corrections.slice(0, MAX_CORRECTIONS)) {
    if (
      !isRecord(correction) ||
      !nonEmptyString(correction.original) ||
      !nonEmptyString(correction.corrected) ||
      !nonEmptyString(correction.reason)
    ) {
      return null
    }

    corrections.push({
      original: correction.original,
      corrected: correction.corrected,
      reason: correction.reason,
    })
  }

  return {
    outcome: value.outcome,
    explanation: value.explanation,
    corrections,
  }
}

export async function prepareScenario(input: {
  situation: string
  objective: string
  courseBand: CourseBand
  variationOf?: { characterRole: string }
}): Promise<AiResult<RehearsalScenario>> {
  return generateStructured({
    messages: [
      {
        role: "system",
        content: scenarioInstructions(input.courseBand, input.variationOf),
      },
      {
        role: "user",
        content: `Situación: ${input.situation}\nObjetivo: ${input.objective}`,
      },
    ],
    schema: scenarioSchema,
    parse: parseScenario,
  })
}

export async function continueRehearsal(
  session: RehearsalSession,
): Promise<AiResult<string>> {
  return generateStructured({
    messages: [
      { role: "system", content: conversationInstructions(session) },
      ...transcript(session),
    ],
    schema: replySchema,
    parse: parseReply,
  })
}

export async function suggestHint(
  session: RehearsalSession,
): Promise<AiResult<RehearsalHint>> {
  return generateStructured({
    messages: [
      { role: "system", content: hintInstructions(session) },
      ...transcript(session),
      { role: "user", content: "Dame una pista para responder." },
    ],
    schema: hintSchema,
    parse: parseHint,
  })
}

export async function evaluateRehearsal(
  session: RehearsalSession,
): Promise<AiResult<RehearsalFeedback>> {
  return generateStructured({
    messages: [
      { role: "system", content: feedbackInstructions(session) },
      ...transcript(session),
    ],
    schema: feedbackSchema,
    parse: parseFeedback,
  })
}
