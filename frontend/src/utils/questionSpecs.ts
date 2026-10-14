// Bảng giới hạn dữ liệu của game, MỘT NƠI DUY NHẤT cho validator và (sau này) các form soạn thảo: thêm loại game hoặc đổi
// giới hạn là sửa ở đây. Nguồn: JSON Schema `backend/src/main/resources/schema/game-dsl/1.0.0/*.schema.json`, SRS (FLD-05..07)
// và luật Lớp 2 trong `docs/game-json-dsl-v1.0.0.md`.
//
// Khi SRS và DSL khác nhau thì lấy GIAO của hai bên (phía khắt khe hơn), xem `docs/decisions.md`:
//   - thời gian trả lời: SRS 10 đến 120 giây, DSL 5 đến 600 giây  => 10 đến 120;
//   - nội dung câu hỏi: SRS tối đa 500 ký tự, DSL tối đa 200       => 200.

export interface Range {
  min: number
  max: number
}

export const GAME_LIMITS = {
  title: { min: 1, max: 100 },
  topic: { min: 1, max: 200 },
  questions: { min: 1, max: 20 },
} as const satisfies Record<string, Range>

export const QUESTION_LIMITS = {
  timeLimitSeconds: { min: 10, max: 120, default: 30 },
  points: { min: 1, max: 100, default: 10 },
  audioText: { min: 1, max: 200 },
  visualPrompt: { min: 1, max: 100 },
} as const

// Giới hạn riêng từng loại game (số phần tử của danh sách và độ dài chữ).
export const TYPE_LIMITS = {
  QUIZ: {
    questionText: { min: 1, max: 200 },
    options: { min: 2, max: 4 },
    optionText: { min: 1, max: 100 },
  },
  AUDIO_VISUAL_MATCH: {
    distractors: { min: 1, max: 3 },
  },
  ODD_ONE_OUT: {
    items: { min: 3, max: 5 },
    itemText: { min: 1, max: 100 },
  },
  SPOT_THE_TARGET: {
    targetDescription: { min: 1, max: 100 },
  },
  WORD_SCRAMBLE: {
    correctWord: { min: 2, max: 10 },
    letters: { min: 2, max: 10 },
  },
  MATCHING: {
    pairs: { min: 3, max: 6 },
    sideText: { min: 1, max: 100 },
  },
  MEMORY_CARD: {
    pairs: { min: 2, max: 8 },
    sideText: { min: 1, max: 100 },
  },
  DRAG_DROP: {
    dropZones: { min: 2, max: 4 },
    zoneLabel: { min: 1, max: 50 },
    items: { min: 3, max: 8 },
    itemText: { min: 1, max: 100 },
  },
  ORDERING: {
    steps: { min: 2, max: 6 },
    stepText: { min: 1, max: 100 },
  },
  VISUAL_CLOZE: {
    sentenceTemplate: { min: 3, max: 200 },
    correctAnswer: { min: 1, max: 50 },
    distractors: { min: 1, max: 3 },
    distractorText: { min: 1, max: 50 },
  },
} as const

/** Chỗ trống trong câu của VISUAL_CLOZE. */
export const CLOZE_BLANK = '___'
