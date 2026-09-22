import type { Vocabulary } from "@/shared/lib/game/types/beat"

export type InteractiveTextSegment =
  | { kind: "text"; text: string }
  | { kind: "vocabulary"; text: string; en: string; es: string }

type Match = {
  start: number
  end: number
  en: string
  es: string
}

function isWordCharacter(value: string | undefined): boolean {
  return value ? /[\p{L}\p{N}_]/u.test(value) : false
}

function hasWordBoundaries(text: string, start: number, end: number, term: string): boolean {
  if (!isWordCharacter(term[0]) && !isWordCharacter(term.at(-1))) {
    return true
  }
  const startsWithWord = isWordCharacter(term[0])
  const endsWithWord = isWordCharacter(term.at(-1))
  return (
    (!startsWithWord || !isWordCharacter(text[start - 1])) &&
    (!endsWithWord || !isWordCharacter(text[end]))
  )
}

export function vocabularyTermAppears(text: string, term: string): boolean {
  const normalizedText = text.toLocaleLowerCase()
  const needle = term.toLocaleLowerCase()
  if (!needle) return false
  let from = 0
  while (from < normalizedText.length) {
    const start = normalizedText.indexOf(needle, from)
    if (start < 0) return false
    const end = start + needle.length
    if (hasWordBoundaries(normalizedText, start, end, needle)) return true
    from = start + 1
  }
  return false
}

export function segmentInteractiveVocabulary(
  text: string,
  vocabulary: Vocabulary[],
): InteractiveTextSegment[] {
  const normalizedText = text.toLocaleLowerCase()
  const matches: Match[] = []

  for (const [en, es] of vocabulary) {
    const term = en.toLocaleLowerCase()
    if (!term) continue
    let from = 0
    while (from < normalizedText.length) {
      const start = normalizedText.indexOf(term, from)
      if (start < 0) break
      const end = start + term.length
      if (hasWordBoundaries(normalizedText, start, end, term)) {
        matches.push({ start, end, en, es })
      }
      from = start + 1
    }
  }

  const selected: Match[] = []
  for (const match of matches.sort(
    (left, right) => right.en.length - left.en.length || left.start - right.start,
  )) {
    if (selected.every((current) => match.end <= current.start || match.start >= current.end)) {
      selected.push(match)
    }
  }
  selected.sort((left, right) => left.start - right.start)

  const segments: InteractiveTextSegment[] = []
  let cursor = 0
  for (const match of selected) {
    if (match.start > cursor) {
      segments.push({ kind: "text", text: text.slice(cursor, match.start) })
    }
    segments.push({
      kind: "vocabulary",
      text: text.slice(match.start, match.end),
      en: match.en,
      es: match.es,
    })
    cursor = match.end
  }
  if (cursor < text.length) {
    segments.push({ kind: "text", text: text.slice(cursor) })
  }
  return segments.length > 0 ? segments : [{ kind: "text", text }]
}
