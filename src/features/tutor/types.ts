export type TutorMessage = {
  role: "user" | "assistant"
  content: string
}

export type TutorRequest = {
  message: string
  history: TutorMessage[]
  missionSlug: string
  beatIndex: number
}

export type TutorReply = {
  explanation: string
  correction: {
    original: string
    corrected: string
    reason: string
  } | null
  example: {
    english: string
    spanish: string
  }
  curiosity: string | null
}
