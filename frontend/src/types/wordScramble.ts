export interface WordScrambleQuestion {
  questionId: string
  targetWord: string
  /** Already shuffled by the question author or AI. Preserve this order. */
  scrambledLetters: string[]
  hintImageUrl?: string
  audioPromptUrl?: string
}

export interface WordScrambleAnswer {
  participantId: string
  questionId: string
  completedWord: string
  timeSpentMs: number
}
