import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH, STAGE_WIDTH } from '../../games/common/mediaLayout'
import { OPTION_BUTTON_HEIGHT, OPTION_BUTTON_WIDTH } from '../../games/common/optionGrid'
import { CARD_MIN_HEIGHT, CARD_WIDTH, CONFIRM_BUTTON_HEIGHT, CONFIRM_BUTTON_WIDTH } from '../../games/matching/matchingLayout'
import { sideDisplay } from '../../games/matching/matchingView'
import type { MatchingQuestion, PairSide, QuizQuestion } from '../../types/game-dsl.types'
import type { GameFacts, TextItem, TouchTarget } from './validateAgainstProfile'

/**
 * Chữ trẻ THẤY trên một bên thẻ MATCHING, lấy từ chính `sideDisplay` của renderer (không gõ lại luật): có ảnh mà không
 * có `text` thì không có chữ (mô tả hình `visualPrompt` chỉ hiện khi chưa có ảnh). Giả định ảnh tải được.
 */
const sideText = (side: PairSide): string => sideDisplay(side).text ?? ''

/**
 * Sự kiện của màn QUIZ, lấy từ HẰNG SỐ BỐ CỤC THẬT của renderer (`optionGrid`, `mediaLayout`), không gõ lại số.
 * Renderer hiện không có đồng hồ đếm ngược hay bảng xếp hạng nên cả hai là `false`.
 */
export function quizFacts(question: QuizQuestion, containerWidth: number): GameFacts {
  const touchTargets: TouchTarget[] = question.options.map((option) => ({
    id: `option.${option.id}`,
    width: OPTION_BUTTON_WIDTH,
    height: OPTION_BUTTON_HEIGHT,
  }))
  if (question.audioUrl) touchTargets.push({ id: 'audioButton', width: AUDIO_BUTTON_WIDTH, height: AUDIO_BUTTON_HEIGHT })

  const texts: TextItem[] = [
    { id: 'question', text: question.questionText, kind: 'question' },
    ...question.options.map((option): TextItem => ({ id: `option.${option.id}`, text: option.text, kind: 'card' })),
  ]
  return {
    mechanic: 'QUIZ',
    stageWidth: STAGE_WIDTH,
    containerWidth,
    touchTargets,
    texts,
    optionCount: question.options.length,
    showsTimer: false,
    showsLiveLeaderboard: false,
  }
}

/**
 * Sự kiện của màn MATCHING. Chiều cao thẻ lấy `CARD_MIN_HEIGHT` (CẬN DƯỚI: thẻ có nhiều chữ hoặc có ảnh cao hơn),
 * nên kết quả vùng chạm là cận dưới đúng: thẻ nào đã không đạt ở đây thì chắc chắn không đạt.
 * Số "lựa chọn" là số cặp cần nối.
 */
export function matchingFacts(question: MatchingQuestion, containerWidth: number, { includeConfirm = true } = {}): GameFacts {
  const touchTargets: TouchTarget[] = question.pairs.flatMap((pair) => [
    { id: `left.${pair.pairId}`, width: CARD_WIDTH, height: CARD_MIN_HEIGHT },
    { id: `right.${pair.pairId}`, width: CARD_WIDTH, height: CARD_MIN_HEIGHT },
  ])
  if (question.audioUrl) touchTargets.push({ id: 'audioButton', width: AUDIO_BUTTON_WIDTH, height: AUDIO_BUTTON_HEIGHT })
  if (includeConfirm) touchTargets.push({ id: 'confirmButton', width: CONFIRM_BUTTON_WIDTH, height: CONFIRM_BUTTON_HEIGHT })

  const texts: TextItem[] = []
  if (question.audioText) texts.push({ id: 'heading', text: question.audioText, kind: 'question' })
  for (const pair of question.pairs) {
    const left = sideText(pair.left)
    const right = sideText(pair.right)
    if (left) texts.push({ id: `left.${pair.pairId}`, text: left, kind: 'card' })
    if (right) texts.push({ id: `right.${pair.pairId}`, text: right, kind: 'card' })
  }
  return {
    mechanic: 'MATCHING',
    stageWidth: STAGE_WIDTH,
    containerWidth,
    touchTargets,
    texts,
    optionCount: question.pairs.length,
    showsTimer: false,
    showsLiveLeaderboard: false,
  }
}
