import { seededDerangement, seededShuffle } from '../../games/common/seededDerangement'
import type { GameType, QuestionOfType, QuestionDsl } from '../../types/game-dsl.types'
import type { AnswerByType, AnswerPayload, StudentQuestionByType } from '../../types/game-student.types'

// Mỗi loại game một bộ xử lý: bỏ trường [ĐA] (dạng học sinh), nêu đáp án đúng, và chấm. Đáp án chỉ tồn tại trong tệp này và
// trong `mockPlayerApi.ts`; thêm loại game mới thì `Record<GameType, ...>` bên dưới báo thiếu lúc build.
// `seed` (sessionId + questionId) làm thứ tự xáo xác định: tải lại vẫn ra cùng thứ tự, như Backend thật (HMAC).

interface Handler<T extends GameType> {
  toStudent(q: QuestionOfType<T>, seed: string): StudentQuestionByType[T]
  /** Đáp án đúng, cùng tên trường với phần trả lời. */
  correct(q: QuestionOfType<T>, seed: string): Record<string, unknown>
  isCorrect(q: QuestionOfType<T>, seed: string, answer: AnswerByType[T]): boolean
}

export interface AnyHandler {
  toStudent(q: QuestionDsl, seed: string): StudentQuestionByType[GameType]
  correct(q: QuestionDsl, seed: string): Record<string, unknown>
  isCorrect(q: QuestionDsl, seed: string, answer: Exclude<AnswerPayload, { outcome: string }>): boolean
}

// Điểm xóa kiểu duy nhất: bảng bên dưới đã ràng buộc từng bộ xử lý đúng với loại game của nó.
const define = <T extends GameType>(handler: Handler<T>) => handler as unknown as AnyHandler

const normalize = (text: string) => text.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && new Set(a).size === a.length && b.every((x) => a.includes(x))
const letterId = (index: number) => String.fromCharCode(97 + index)

export const MOCK_HANDLERS: Record<GameType, AnyHandler> = {
  QUIZ: define<'QUIZ'>({
    toStudent: ({ correctOptionId: _drop, options, ...rest }, seed) => ({ ...rest, options: seededShuffle(options, seed) }),
    correct: (q) => ({ selectedOptionId: q.correctOptionId }),
    isCorrect: (q, _seed, a) => a.selectedOptionId === q.correctOptionId,
  }),

  AUDIO_VISUAL_MATCH: define<'AUDIO_VISUAL_MATCH'>({
    toStudent: (q, seed) => {
      const { correct: _c, distractors: _d, ...rest } = q

      return { ...rest, options: avmOptions(q, seed).options }
    },
    correct: (q, seed) => ({ selectedOptionId: avmOptions(q, seed).correctId }),
    isCorrect: (q, seed, a) => a.selectedOptionId === avmOptions(q, seed).correctId,
  }),

  ODD_ONE_OUT: define<'ODD_ONE_OUT'>({
    toStudent: ({ oddOneOutId: _drop, items, ...rest }, seed) => ({ ...rest, items: seededShuffle(items, seed) }),
    correct: (q) => ({ selectedItemId: q.oddOneOutId }),
    isCorrect: (q, _seed, a) => a.selectedItemId === q.oddOneOutId,
  }),

  SPOT_THE_TARGET: define<'SPOT_THE_TARGET'>({
    toStudent: ({ hitRegion: _drop, ...rest }) => rest,
    correct: (q) => ({ ...q.hitRegion }),
    isCorrect: (q, _seed, a) => (q.hitRegion ? Math.hypot(a.x - q.hitRegion.x, a.y - q.hitRegion.y) <= q.hitRegion.radius : false),
  }),

  WORD_SCRAMBLE: define<'WORD_SCRAMBLE'>({
    toStudent: ({ correctWord: _drop, ...rest }) => rest,
    correct: (q) => ({ word: q.correctWord }),
    isCorrect: (q, _seed, a) => normalize(a.word) === normalize(q.correctWord),
  }),

  MATCHING: define<'MATCHING'>({
    toStudent: (q, seed) => {
      const { pairs, ...rest } = q
      const rightOrder = seededDerangement(pairs, seed)

      return {
        ...rest,
        leftItems: pairs.map((p, i) => ({ id: `l${i + 1}`, ...p.left })),
        rightItems: rightOrder.map((p, k) => ({ id: `r${k + 1}`, ...p.right })),
      }
    },
    correct: (q, seed) => ({ matches: correctMatches(q.pairs, seed) }),
    isCorrect: (q, seed, a) => {
      const correct = correctMatches(q.pairs, seed)

      return a.matches.length === correct.length && correct.every((c) => a.matches.some((m) => m.leftPairId === c.leftPairId && m.rightPairId === c.rightPairId))
    },
  }),

  // Không có bí mật: giữ nguyên `pairs`, renderer nhân đôi và xáo thẻ.
  MEMORY_CARD: define<'MEMORY_CARD'>({
    toStudent: (q) => structuredClone(q),
    correct: (q) => ({ matchedPairIds: q.pairs.map((p) => p.pairId) }),
    isCorrect: (q, _seed, a) => sameSet(
      a.matchedPairIds,
      q.pairs.map((p) => p.pairId),
    ),
  }),

  DRAG_DROP: define<'DRAG_DROP'>({
    toStudent: ({ items, ...rest }, seed) => ({
      ...rest,
      items: seededShuffle(items, seed).map(({ targetZoneId: _drop, ...item }) => item),
    }),
    correct: (q) => ({ placements: q.items.map((item) => ({ itemId: item.id, zoneId: item.targetZoneId })) }),
    isCorrect: (q, _seed, a) =>
      sameSet(a.placements.map((p) => p.itemId), q.items.map((item) => item.id)) &&
      a.placements.every((p) => q.items.find((item) => item.id === p.itemId)?.targetZoneId === p.zoneId),
  }),

  ORDERING: define<'ORDERING'>({
    // Id hiển thị gán theo vị trí SAU khi xáo: id gốc (s1, s2... đánh theo thứ tự đúng) sẽ lộ đáp án.
    toStudent: ({ steps, ...rest }, seed) => ({
      ...rest,
      steps: orderingView(steps, seed).map(({ correctPosition: _drop, ...step }, i) => ({ ...step, id: displayStepId(i) })),
    }),
    correct: (q, seed) => ({ order: correctDisplayOrder(q.steps, seed) }),
    isCorrect: (q, seed, a) => {
      const order = correctDisplayOrder(q.steps, seed)

      return a.order.length === order.length && order.every((id, i) => a.order[i] === id)
    },
  }),

  VISUAL_CLOZE: define<'VISUAL_CLOZE'>({
    toStudent: ({ correctAnswer, distractors, ...rest }, seed) => ({ ...rest, options: seededShuffle([correctAnswer, ...distractors], seed) }),
    correct: (q) => ({ answer: q.correctAnswer }),
    isCorrect: (q, _seed, a) => normalize(a.answer) === normalize(q.correctAnswer),
  }),
}

/** Hình đúng và hình nhiễu xáo chung, id a, b, c... gán SAU khi xáo. */
function avmOptions(q: QuestionOfType<'AUDIO_VISUAL_MATCH'>, seed: string) {
  const shuffled = seededShuffle([{ ...q.correct, isCorrect: true }, ...q.distractors.map((d) => ({ ...d, isCorrect: false }))], seed)
  const options = shuffled.map(({ isCorrect: _drop, ...image }, i) => ({ id: letterId(i), ...image }))

  return { options, correctId: letterId(shuffled.findIndex((item) => item.isCorrect)) }
}

/** Cột trái giữ thứ tự `pairs` (l1, l2...), cột phải xáo (r1, r2...) sao cho không cặp nào cùng hàng. */
function correctMatches(pairs: QuestionOfType<'MATCHING'>['pairs'], seed: string) {
  const rightOrder = seededDerangement(pairs, seed)

  return pairs.map((pair, i) => ({ leftPairId: `l${i + 1}`, rightPairId: `r${rightOrder.indexOf(pair) + 1}` }))
}

const displayStepId = (index: number) => `s${index + 1}`

/** Thứ tự hiển thị đã xáo; xáo lại vài lần nếu tình cờ ra đúng thứ tự đúng (ván chơi vô nghĩa). */
function orderingView(steps: QuestionOfType<'ORDERING'>['steps'], seed: string) {
  const inOrder = (view: typeof steps) => view.every((step, i) => step.correctPosition === i + 1)
  let view = seededShuffle(steps, seed)

  for (let attempt = 1; attempt <= 5 && inOrder(view); attempt++) view = seededShuffle(steps, `${seed}#${attempt}`)

  return view
}

function correctDisplayOrder(steps: QuestionOfType<'ORDERING'>['steps'], seed: string) {
  return orderingView(steps, seed)
    .map((step, i) => ({ id: displayStepId(i), position: step.correctPosition }))
    .sort((a, b) => a.position - b.position)
    .map((step) => step.id)
}
