import { viText } from '../constants/viText'
import type {
  GameDsl,
  GameType,
  PairSide,
  QuestionDsl,
  QuestionOfType,
} from '../types/game-dsl.types'

// Tóm tắt một câu hỏi thành một dòng để giáo viên nhận ra câu đó trong danh sách. Mỗi loại game một hàm (bảng tra, không
// rẽ nhánh theo loại): thêm loại mới là thêm một dòng, và trình biên dịch buộc phải có đủ 10 loại.

const text = viText.editor.summary

const sideText = (side: PairSide) => side.text?.trim() || side.visualPrompt?.trim() || ''

const joined = (values: ReadonlyArray<string>, separator = ', ') =>
  values.map((value) => value.trim()).filter(Boolean).join(separator)

// Ghép tiền tố với phần liệt kê; không có gì để liệt kê thì trả rỗng để dòng tóm tắt thành "Câu chưa có nội dung".
const listed = (prefix: string, items: string) => (items ? `${prefix}: ${items}` : '')

const SUMMARIZERS: { [T in GameType]: (question: QuestionOfType<T>) => string } = {
  QUIZ: (q) => q.questionText,
  AUDIO_VISUAL_MATCH: (q) => (q.audioText?.trim() ? `${text.listen}: ${q.audioText}` : ''),
  ODD_ONE_OUT: (q) => joined(q.items.map((item) => item.text), ' · '),
  SPOT_THE_TARGET: (q) => (q.targetDescription?.trim() ? `${text.find}: ${q.targetDescription}` : ''),
  WORD_SCRAMBLE: (q) => (q.scrambledLetters.length > 0 ? `${text.scramble}: ${q.scrambledLetters.join(' ')}` : ''),
  MATCHING: (q) => listed(`${q.pairs.length} ${text.pairs}`, joined(q.pairs.map((pair) => sideText(pair.left)))),
  MEMORY_CARD: (q) => listed(`${q.pairs.length} ${text.cardPairs}`, joined(q.pairs.map((pair) => sideText(pair.content)))),
  DRAG_DROP: (q) => listed(text.dropInto, joined(q.dropZones.map((zone) => zone.label))),
  ORDERING: (q) => {
    const ordered = [...q.steps].sort((a, b) => a.correctPosition - b.correctPosition)

    return listed(`${q.steps.length} ${text.steps}`, joined(ordered.map((step) => step.text?.trim() || step.visualPrompt || ''), ' → '))
  },
  VISUAL_CLOZE: (q) => q.sentenceTemplate,
}

/** Tóm tắt một dòng cho câu `question` của game loại `gameType`; câu rỗng thì trả câu "chưa có nội dung". */
export function summarizeQuestion(gameType: GameType, question: QuestionDsl): string {
  // Một cast duy nhất: kiểu câu hỏi đã được `gameType` quyết định (union phân biệt ở cấp game, không ở cấp câu).
  const summarize = SUMMARIZERS[gameType] as (question: QuestionDsl) => string
  const summary = summarize(question).trim()

  return summary || text.noContent
}

export const summarizeQuestions = (game: GameDsl): string[] =>
  game.questions.map((question) => summarizeQuestion(game.gameType, question))
