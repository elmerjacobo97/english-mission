import type {
  Challenge,
  ListenChallenge,
  TypeChallenge,
} from "@/shared/lib/game/types/beat"
import type { ReviewQueueItem, ReviewWord } from "./review-queue"

function optionWords(word: ReviewWord, pool: ReviewWord[]): string[] {
  const others = pool.filter((candidate) => candidate.key !== word.key)
  const sameChapter = others.filter(
    (candidate) => candidate.chapter === word.chapter,
  )
  const otherChapters = others.filter(
    (candidate) => candidate.chapter !== word.chapter,
  )
  return [...sameChapter, ...otherChapters]
    .slice(0, 2)
    .map((candidate) => candidate.en)
}

function buildOptions(
  word: ReviewWord,
  pool: ReviewWord[],
): { options: string[]; correct: number } | null {
  const options = [word.en, ...optionWords(word, pool)].sort()
  if (options.length < 2) {
    return null
  }
  return { options, correct: options.indexOf(word.en) }
}

function typeChallenge(word: ReviewWord): TypeChallenge {
  return {
    kind: "type",
    prompt: `Escribe en inglés: «${word.es}»`,
    accepted: [word.en],
    hint: `Empieza con «${word.en[0]}» y tiene ${word.en.length} letras.`,
  }
}

function buildListen(
  word: ReviewWord,
  pool: ReviewWord[],
): ListenChallenge | null {
  const built = buildOptions(word, pool)
  if (!built) {
    return null
  }
  return {
    kind: "listen",
    prompt: "Escucha y elige la palabra que oíste.",
    phrase: word.en,
    options: built.options,
    correct: built.correct,
  }
}

export function buildReviewChallenge(
  word: ReviewQueueItem,
  pool: ReviewWord[],
  speechAvailable: boolean,
): Challenge {
  if (word.box === 1) {
    const built = buildOptions(word, pool)
    if (built) {
      return {
        kind: "choice",
        prompt: `¿Cómo se dice «${word.es}» en inglés?`,
        options: built.options,
        correct: built.correct,
      }
    }
    return typeChallenge(word)
  }
  if (word.box === 2) {
    return typeChallenge(word)
  }
  if (speechAvailable) {
    const listen = buildListen(word, pool)
    if (listen) {
      return listen
    }
  }
  return typeChallenge(word)
}
