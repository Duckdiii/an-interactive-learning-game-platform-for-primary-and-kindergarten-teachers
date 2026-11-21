// Kiểu của `POST /games/understand` (docs/openapi/openapi.yaml): khung chat tạo game và thẻ "Hệ thống hiểu như sau".

export interface ChatTurn {
  role: 'TEACHER' | 'ASSISTANT'
  text: string
}

export interface UnsupportedNeed {
  need: string
  fallback: string
}

export interface GameUnderstanding {
  learningGoal: string
  childAction: string
  content: string[]
  setting: string
  gameType: string
  alternativeGameTypes: string[]
  unsupported: UnsupportedNeed[]
  assumptions: string[]
}

export interface UnderstandGameRequest {
  subject: string
  gradeLevel: string
  messages: ChatTurn[]
  understanding?: GameUnderstanding
}

export interface ClarifyingQuestion {
  text: string
  quickReplies: string[]
}

export interface GameUnderstandingResponse {
  reply: string
  question: ClarifyingQuestion | null
  understanding: GameUnderstanding
  ready: boolean
}
