const MIN_TYPO_LENGTH = 4
const DEFAULT_TYPO_TOLERANCE = 1

export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      )
    }
    previous = current
  }
  return previous[b.length]
}

function isCloseEnough(
  typed: string,
  expected: string,
  typoTolerance: number,
): boolean {
  if (typed === expected) return true
  if (typoTolerance === 0) return false
  if (typed.length < MIN_TYPO_LENGTH || expected.length < MIN_TYPO_LENGTH) {
    return false
  }
  return editDistance(typed, expected) <= typoTolerance
}

export type TypedCheck = { ok: true } | { ok: false; wrongWord?: string }

export function checkTypedAnswer(
  input: string,
  accepted: string[],
  typoTolerance: number = DEFAULT_TYPO_TOLERANCE,
): TypedCheck {
  const normalized = normalizeAnswer(input)
  if (normalized.length === 0) {
    return { ok: false }
  }
  if (accepted.some((answer) => normalizeAnswer(answer) === normalized)) {
    return { ok: true }
  }

  const typedWords = normalized.split(" ")
  for (const answer of accepted) {
    const expectedWords = normalizeAnswer(answer).split(" ")
    if (typedWords.length !== expectedWords.length) {
      continue
    }
    if (
      typedWords.every((word, i) =>
        isCloseEnough(word, expectedWords[i], typoTolerance),
      )
    ) {
      return { ok: true }
    }
  }

  const reference = normalizeAnswer(accepted[0]).split(" ")
  const wrongWord =
    typedWords.length === reference.length
      ? typedWords.find(
          (word, i) => !isCloseEnough(word, reference[i], typoTolerance),
        )
      : undefined
  return { ok: false, wrongWord }
}

export function checkOrderedAnswer(attempt: string[], solution: string[]): boolean {
  if (attempt.length !== solution.length) {
    return false
  }
  return attempt.every(
    (token, i) => normalizeAnswer(token) === normalizeAnswer(solution[i]),
  )
}
