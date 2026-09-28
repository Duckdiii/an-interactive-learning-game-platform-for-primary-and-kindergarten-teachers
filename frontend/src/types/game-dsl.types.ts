/**
 * Game JSON DSL v1.0.0 — kiểu TypeScript khớp với đặc tả `docs/game-json-dsl-v1.0.0.md`, JSON Schema
 * `backend/src/main/resources/schema/game-dsl/1.0.0/*.schema.json` và record Java `dto/dsl`.
 * Sửa DSL thì phải sửa đồng bộ cả bốn nơi.
 *
 * Mỗi câu trong `questions` là một màn chơi. Trường đáp án được ghi chú [ĐA]: renderer không được hiển thị đáp án
 * ra trước khi trẻ trả lời. Các trường có dấu `?` là tùy chọn (Backend bỏ hẳn khi không có giá trị).
 */

export const GAME_DSL_SCHEMA_VERSION = '1.0.0'

export const GAME_TYPES = [
  'QUIZ',
  'AUDIO_VISUAL_MATCH',
  'ODD_ONE_OUT',
  'SPOT_THE_TARGET',
  'WORD_SCRAMBLE',
  'MATCHING',
  'MEMORY_CARD',
  'DRAG_DROP',
  'ORDERING',
  'VISUAL_CLOZE',
] as const
export type GameType = (typeof GAME_TYPES)[number]

export const SUBJECTS = ['MATH', 'VIETNAMESE', 'ENGLISH'] as const
export type Subject = (typeof SUBJECTS)[number]

export const GRADE_LEVELS = ['KINDERGARTEN', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5'] as const
export type GradeLevel = (typeof GRADE_LEVELS)[number]

export interface GameMetadata {
  /** 1 đến 100 ký tự. */
  title: string
  subject: Subject
  gradeLevel: GradeLevel
  /** 1 đến 200 ký tự. */
  topic: string
}

export interface GameplaySettings {
  /** Hệ số nới vùng chạm: 1.5 cho mầm non và lớp 1, 1.0 cho các lớp còn lại. */
  hitboxScale: number
}

// ---- phần dùng chung ----

/**
 * Các trường chung của một màn chơi. `audioText` và `visualPrompt` do AI sinh; `audioUrl` và `imageUrl` do Backend
 * điền sau (TTS, tìm ảnh) nên có thể chưa có.
 */
export interface QuestionBase {
  id: string
  timeLimitSeconds: number
  points: number
  audioText?: string
  audioUrl?: string
  visualPrompt?: string
  imageUrl?: string
}

/** Lựa chọn dạng chữ. `id` theo vị trí: a, b, c... */
export interface TextChoice {
  id: string
  text: string
}

/** Lựa chọn dạng hình. */
export interface ImageChoice {
  visualPrompt: string
  imageUrl?: string
}

/** Một phía của cặp (chữ và/hoặc hình). */
export interface PairSide {
  text?: string
  visualPrompt?: string
  imageUrl?: string
}

// ---- từng loại game ----

export interface QuizQuestion extends QuestionBase {
  questionText: string
  options: TextChoice[]
  /** [ĐA] id của lựa chọn đúng. */
  correctOptionId: string
}

export interface AudioVisualMatchQuestion extends QuestionBase {
  /** Âm thanh cần nghe (bắt buộc với loại này). */
  audioText: string
  /** [ĐA] hình đúng. */
  correct: ImageChoice
  distractors: ImageChoice[]
}

export interface OddOneOutQuestion extends QuestionBase {
  items: TextChoice[]
  /** [ĐA] id của mục khác loại. */
  oddOneOutId: string
}

/** Vùng đúng, tỉ lệ 0 đến 1 so với ảnh. */
export interface HitRegion {
  x: number
  y: number
  radius: number
}

export interface SpotTheTargetQuestion extends QuestionBase {
  /** Ảnh nền (bắt buộc với loại này). */
  visualPrompt: string
  targetDescription: string
  /** [ĐA] vắng khi còn là bản nháp: giáo viên chạm ảnh để chọn. */
  hitRegion?: HitRegion
}

export interface WordScrambleQuestion extends QuestionBase {
  /** [ĐA] */
  correctWord: string
  scrambledLetters: string[]
}

export interface MatchingPair {
  pairId: string
  left: PairSide
  /** [ĐA] phía ghép đúng với `left`. */
  right: PairSide
}

export interface MatchingQuestion extends QuestionBase {
  pairs: MatchingPair[]
}

export interface MemoryPair {
  pairId: string
  /** Nội dung của cặp; renderer nhân đôi thành 2 thẻ. */
  content: PairSide
}

export interface MemoryCardQuestion extends QuestionBase {
  pairs: MemoryPair[]
}

export interface DropZone {
  id: string
  label: string
}

export interface DraggableItem {
  id: string
  text?: string
  visualPrompt?: string
  imageUrl?: string
  /** [ĐA] id của vùng thả mà vật này thuộc về. */
  targetZoneId: string
}

export interface DragDropQuestion extends QuestionBase {
  dropZones: DropZone[]
  items: DraggableItem[]
}

export interface OrderStep {
  id: string
  text?: string
  visualPrompt?: string
  imageUrl?: string
  /** [ĐA] vị trí đúng, bắt đầu từ 1. Thứ tự các bước trong mảng là thứ tự hiển thị (khác thứ tự đúng). */
  correctPosition: number
}

export interface OrderingQuestion extends QuestionBase {
  steps: OrderStep[]
}

export interface VisualClozeQuestion extends QuestionBase {
  /** Ảnh minh họa (bắt buộc với loại này). */
  visualPrompt: string
  /** Câu có đúng một chỗ trống "___". */
  sentenceTemplate: string
  /** [ĐA] */
  correctAnswer: string
  distractors: string[]
}

// ---- game hoàn chỉnh ----

interface GameEnvelope<T extends GameType, Q extends QuestionBase> {
  schemaVersion: typeof GAME_DSL_SCHEMA_VERSION
  gameType: T
  metadata: GameMetadata
  gameplaySettings: GameplaySettings
  questions: Q[]
}

export type QuizGame = GameEnvelope<'QUIZ', QuizQuestion>
export type AudioVisualMatchGame = GameEnvelope<'AUDIO_VISUAL_MATCH', AudioVisualMatchQuestion>
export type OddOneOutGame = GameEnvelope<'ODD_ONE_OUT', OddOneOutQuestion>
export type SpotTheTargetGame = GameEnvelope<'SPOT_THE_TARGET', SpotTheTargetQuestion>
export type WordScrambleGame = GameEnvelope<'WORD_SCRAMBLE', WordScrambleQuestion>
export type MatchingGame = GameEnvelope<'MATCHING', MatchingQuestion>
export type MemoryCardGame = GameEnvelope<'MEMORY_CARD', MemoryCardQuestion>
export type DragDropGame = GameEnvelope<'DRAG_DROP', DragDropQuestion>
export type OrderingGame = GameEnvelope<'ORDERING', OrderingQuestion>
export type VisualClozeGame = GameEnvelope<'VISUAL_CLOZE', VisualClozeQuestion>

/** Game DSL hoàn chỉnh. Thu hẹp kiểu bằng `game.gameType` (union phân biệt). */
export type GameDsl =
  | QuizGame
  | AudioVisualMatchGame
  | OddOneOutGame
  | SpotTheTargetGame
  | WordScrambleGame
  | MatchingGame
  | MemoryCardGame
  | DragDropGame
  | OrderingGame
  | VisualClozeGame

export type QuestionDsl = GameDsl['questions'][number]

/** Kiểu game DSL của một loại game cụ thể: `GameOfType<'QUIZ'>` là `QuizGame`. */
export type GameOfType<T extends GameType> = Extract<GameDsl, { gameType: T }>

/** Kiểu màn chơi của một loại game cụ thể: `QuestionOfType<'QUIZ'>` là `QuizQuestion`. */
export type QuestionOfType<T extends GameType> = GameOfType<T>['questions'][number]
