export type Vocabulary = [en: string, es: string]

export type StoryBeat = {
  kind: "story"
  es: string
  en?: string
  vocab?: Vocabulary[]
}

export type ChoiceChallenge = {
  kind: "choice"
  prompt: string
  options: string[]
  correct: number
}

export type OrderChallenge = {
  kind: "order"
  prompt: string
  tokens: string[]
  solution: string[]
}

export type TypeChallenge = {
  kind: "type"
  prompt: string
  accepted: string[]
  hint: string
}

export type Challenge = ChoiceChallenge | OrderChallenge | TypeChallenge

export type Beat = StoryBeat | Challenge
