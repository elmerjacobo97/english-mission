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

export type FillChallenge = {
  kind: "fill"
  prompt: string
  sentence: string
  answer: string
  alternatives?: string[]
}

export type ListenChallenge = {
  kind: "listen"
  prompt: string
  phrase: string
  options: string[]
  correct: number
}

export type DialogueChallenge = {
  kind: "dialogue"
  prompt: string
  line: string
  options: string[]
  correct: number
}

export type Challenge =
  | ChoiceChallenge
  | OrderChallenge
  | TypeChallenge
  | FillChallenge
  | ListenChallenge
  | DialogueChallenge

export type ChallengeKind = Challenge["kind"]

export type Beat = StoryBeat | Challenge
