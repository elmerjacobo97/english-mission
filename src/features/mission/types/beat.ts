import type { CharacterId, Mood } from "./character"

export type Vocabulary = [en: string, es: string]

export type GrammarNote = {
  title: string
  body: string
  label?: string
  open?: boolean
}

type BeatMeta = {
  character?: CharacterId
  mood?: Mood
  note?: GrammarNote
}

export type Speaker = "you" | CharacterId

type StoryBase = BeatMeta & {
  kind: "story"
  es: string
  vocab?: Vocabulary[]
}

export type StoryBeat =
  | (StoryBase & { en: string; speaker: Speaker })
  | (StoryBase & { en?: undefined; speaker?: Speaker })

export type ChoiceChallenge = BeatMeta & {
  kind: "choice"
  prompt: string
  options: string[]
  correct: number
}

export type OrderChallenge = BeatMeta & {
  kind: "order"
  prompt: string
  tokens: string[]
  solution: string[]
}

export type TypeChallenge = BeatMeta & {
  kind: "type"
  prompt: string
  accepted: string[]
  hint: string
}

export type FillChallenge = BeatMeta & {
  kind: "fill"
  prompt: string
  sentence: string
  answer: string
  alternatives?: string[]
}

export type ListenChallenge = BeatMeta & {
  kind: "listen"
  prompt: string
  phrase: string
  options: string[]
  correct: number
}

export type DialogueChallenge = BeatMeta & {
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
