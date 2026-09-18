import type { Beat, Vocabulary } from "../types/beat"
import type { Mission } from "../types/mission"

export const SPAINISMS = [
  "dependiente",
  "nevera",
  "ordenador",
  "movil",
  "piso",
  "coche",
  "vosotros",
  "zumo",
  "patata",
  "coger",
  "camarero",
  "conducir",
  "aparcar",
  "tarta",
]

const STOPWORDS = new Set([
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "me",
  "him",
  "her",
  "us",
  "them",
  "my",
  "your",
  "his",
  "its",
  "our",
  "their",
  "the",
  "a",
  "an",
  "is",
  "are",
  "am",
  "was",
  "were",
  "be",
  "been",
  "being",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "can",
  "could",
  "will",
  "would",
  "should",
  "must",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "with",
  "from",
  "by",
  "and",
  "or",
  "but",
  "so",
  "if",
  "not",
  "here",
  "there",
  "this",
  "that",
  "these",
  "those",
  "what",
  "how",
  "when",
  "who",
])

export function tokenizeEnglish(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
}

export function contentWords(text: string): string[] {
  return tokenizeEnglish(text).filter((word) => !STOPWORDS.has(word))
}

export function vocabTokens(vocab: Vocabulary[]): string[] {
  return vocab.flatMap(([en]) => contentWords(en))
}

export function beatEnglishTexts(beat: Beat): string[] {
  switch (beat.kind) {
    case "story":
      return beat.en ? [beat.en] : []
    case "choice":
    case "listen":
    case "dialogue":
      return [...beat.options]
    case "order":
      return [...beat.tokens]
    case "type":
      return [...beat.accepted]
    case "fill":
      return [beat.sentence, beat.answer, ...(beat.alternatives ?? [])]
  }
}

export function missionContentWords(mission: Mission): string[] {
  return mission.beats.flatMap((beat) => beatEnglishTexts(beat).flatMap(contentWords))
}

export function missionVocabTokens(mission: Mission): string[] {
  return vocabTokens(mission.vocab)
}

export function introducedVocab(
  missions: Mission[],
  beforeOrder: number,
): Set<string> {
  const introduced = new Set<string>()
  for (const mission of missions) {
    if (mission.order >= beforeOrder) {
      continue
    }
    for (const token of missionVocabTokens(mission)) {
      introduced.add(token)
    }
  }
  return introduced
}

export function recycledWords(
  mission: Mission,
  previous: Set<string>,
): string[] {
  const words = new Set(missionContentWords(mission))
  return [...words].filter((word) => previous.has(word))
}

export function orphanVocab(mission: Mission): string[] {
  const text = new Set(missionContentWords(mission))
  return mission.vocab
    .filter(([, es]) => es.length > 0)
    .map(([en]) => ({ en, tokens: contentWords(en) }))
    .filter(({ tokens }) => tokens.length > 0)
    .filter(({ tokens }) => !tokens.some((token) => text.has(token)))
    .map(({ en }) => en)
}

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

export function findSpainisms(text: string): string[] {
  const normalized = normalizeForSearch(text)
  return SPAINISMS.filter((word) =>
    new RegExp(`\\b${word}\\b`).test(normalized),
  )
}

export function beatSpanishTexts(beat: Beat): string[] {
  switch (beat.kind) {
    case "story":
      return [beat.es]
    case "choice":
      return [beat.prompt, ...beat.options]
    case "order":
      return [beat.prompt]
    case "type":
      return [beat.prompt, beat.hint]
    case "fill":
      return [beat.prompt]
    case "listen":
    case "dialogue":
      return [beat.prompt]
  }
}

export function missionSpanishText(mission: Mission): string {
  return [
    mission.title,
    mission.subtitle,
    ...mission.vocab.map(([, es]) => es),
    ...mission.beats.flatMap(beatSpanishTexts),
  ].join(" ")
}

export function missionNotes(mission: Mission) {
  return mission.beats.flatMap((beat) => (beat.note ? [beat.note] : []))
}

export function missionCharacters(mission: Mission): string[] {
  return [
    ...new Set(
      mission.beats.flatMap((beat) => (beat.character ? [beat.character] : [])),
    ),
  ]
}
