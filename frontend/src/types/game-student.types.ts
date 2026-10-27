import type {
  DraggableItem,
  DropZone,
  GameMetadata,
  GameType,
  GameplaySettings,
  MemoryPair,
  OrderStep,
  PairSide,
  QuestionBase,
  TextChoice,
} from './game-dsl.types'

/**
 * Dạng câu hỏi Backend gửi cho HỌC SINH (REST API Contract mục 5.5, `GET /sessions/{id}/questions`): bỏ mọi
 * trường đáp án và các phần tử đã được xáo. Đây KHÔNG phải một phần của Game JSON DSL v1.0.0 (DSL chỉ mô
 * tả dạng đầy đủ cho giáo viên) nên đặt riêng để không đụng vào contract đã freeze.
 */

/**
 * Một ô ở dạng học sinh của MATCHING. `id` là mã mờ do Backend cấp (`l1, l2...` cho cột trái, `r1, r2...` cho
 * cột phải), KHÔNG phải `pairId` thật, để học sinh không suy ra đáp án từ id hay thứ tự.
 */
export interface MatchingStudentItem extends PairSide {
  id: string
}

/**
 * MATCHING dạng học sinh: tách hai cột, cả hai đã được Backend xáo (xác định theo HMAC nên tải lại vẫn ra cùng
 * thứ tự). Client giữ nguyên thứ tự này, không xáo lại.
 */
export interface MatchingStudentQuestion extends QuestionBase {
  leftItems: MatchingStudentItem[]
  rightItems: MatchingStudentItem[]
}

// ---- Phần còn lại của dạng học sinh (API-CONTRACT.md mục 2.3): MỌI trường [ĐA] đã bỏ, phần tử đã xáo ----

export interface StudentQuizQuestion extends QuestionBase {
  questionText: string
  options: TextChoice[]
}

/** `id` (a, b, c...) gán SAU khi xáo nên không suy ra được hình đúng từ id. */
export interface StudentImageOption {
  id: string
  visualPrompt: string
  imageUrl?: string
}

export interface StudentAudioVisualMatchQuestion extends QuestionBase {
  audioText: string
  options: StudentImageOption[]
}

export interface StudentOddOneOutQuestion extends QuestionBase {
  items: TextChoice[]
}

export interface StudentSpotTheTargetQuestion extends QuestionBase {
  visualPrompt: string
  targetDescription: string
}

export interface StudentWordScrambleQuestion extends QuestionBase {
  scrambledLetters: string[]
}

export interface StudentMemoryCardQuestion extends QuestionBase {
  pairs: MemoryPair[]
}

export interface StudentDragDropQuestion extends QuestionBase {
  dropZones: DropZone[]
  items: Omit<DraggableItem, 'targetZoneId'>[]
}

/** Thứ tự mảng `steps` là thứ tự hiển thị đã xáo. */
export interface StudentOrderingQuestion extends QuestionBase {
  steps: Omit<OrderStep, 'correctPosition'>[]
}

export interface StudentVisualClozeQuestion extends QuestionBase {
  visualPrompt: string
  sentenceTemplate: string
  /** Đáp án đúng lẫn từ nhiễu, đã xáo. */
  options: string[]
}

export interface StudentQuestionByType {
  QUIZ: StudentQuizQuestion
  AUDIO_VISUAL_MATCH: StudentAudioVisualMatchQuestion
  ODD_ONE_OUT: StudentOddOneOutQuestion
  SPOT_THE_TARGET: StudentSpotTheTargetQuestion
  WORD_SCRAMBLE: StudentWordScrambleQuestion
  MATCHING: MatchingStudentQuestion
  MEMORY_CARD: StudentMemoryCardQuestion
  DRAG_DROP: StudentDragDropQuestion
  ORDERING: StudentOrderingQuestion
  VISUAL_CLOZE: StudentVisualClozeQuestion
}

interface StudentEnvelope<T extends GameType> {
  schemaVersion: '1.0.0'
  gameType: T
  metadata: GameMetadata
  gameplaySettings: GameplaySettings
  questions: StudentQuestionByType[T][]
  /** Câu đã nộp, để tiếp tục đúng chỗ khi tải lại trang. */
  answeredQuestionIds: string[]
}

/** Game dạng học sinh (`GET /sessions/{id}/questions`). Thu hẹp bằng `game.gameType`. */
export type StudentGame = { [T in GameType]: StudentEnvelope<T> }[GameType]

// ---- Trả lời và kết quả chấm (API-CONTRACT.md mục 2.4) ----

export interface AnswerByType {
  QUIZ: { selectedOptionId: string }
  AUDIO_VISUAL_MATCH: { selectedOptionId: string }
  ODD_ONE_OUT: { selectedItemId: string }
  SPOT_THE_TARGET: { x: number; y: number }
  WORD_SCRAMBLE: { word: string }
  MATCHING: { matches: { leftPairId: string; rightPairId: string }[] }
  MEMORY_CARD: { matchedPairIds: string[]; flips: number }
  DRAG_DROP: { placements: { itemId: string; zoneId: string }[] }
  ORDERING: { order: string[] }
  VISUAL_CLOZE: { answer: string }
}

/** Hết giờ hoặc bỏ qua: không có trường trả lời. */
export interface NoAnswer {
  outcome: 'TIMEOUT' | 'SKIPPED'
}

export type AnswerPayload = AnswerByType[GameType] | NoAnswer

export type InteractionStatus = 'CORRECT' | 'INCORRECT' | 'TIMEOUT' | 'SKIPPED'

export interface AnswerResult {
  status: InteractionStatus
  isCorrect: boolean
  pointsEarned: number
  totalScore: number
  /** Chỉ có SAU khi chấm; cùng tên trường với phần trả lời (SPOT_THE_TARGET: vùng đúng `{x, y, radius}`). */
  correctAnswer: Record<string, unknown> | null
  /** Lời giải thích (FLD-13); `null` cho đến khi DSL có trường này. */
  explanation?: string | null
}

// ---- Phiên chơi và thông tin xuất bản ----

export type UiOverride = 'AUTO' | 'BE' | 'HOC_SINH'

/** `GET /games/shared/{code}` đã mở rộng (API-CONTRACT.md mục 2.1): đủ để chọn khung trước khi có phiên. */
export interface PublishInfo {
  gameTitle: string
  gameType: GameType
  questionCount: number
  metadata: Pick<GameMetadata, 'subject' | 'gradeLevel' | 'topic'>
  uiOverride: UiOverride
  themeId: string | null
}

/** `POST /games/shared/{code}/play` (phiên tự luyện SELF). */
export interface PlayerSession {
  sessionId: string
  participantId: string
  nickname: string
  sessionType: 'SELF'
  status: 'ACTIVE'
  expiresAt: string
}
