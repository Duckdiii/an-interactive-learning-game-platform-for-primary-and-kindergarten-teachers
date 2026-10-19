import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH, STAGE_WIDTH } from '../../../games/common/mediaLayout'
import type { GameFacts, TextItem, TouchTarget } from '../../age/validateAgainstProfile'
import { tickCount } from './numberLineLogic'
import {
  BAND_HEIGHT,
  BAND_WIDTH,
  CONFIRM_BUTTON_HEIGHT,
  CONFIRM_BUTTON_WIDTH,
  MARKER_HIT_RADIUS,
  STEP_BUTTON_HEIGHT,
  STEP_BUTTON_WIDTH,
} from './numberLineLayout'
import type { NumberLineQuestion, NumberLineStudentQuestion } from './numberLineTypes'

/**
 * Sự kiện của màn NUMBER_LINE cho `validateAgainstProfile`, lấy từ HẰNG SỐ BỐ CỤC THẬT của renderer (không gõ lại số).
 * Vùng chạm: cả dải thang (chạm đặt điểm vào vạch gần nhất), điểm kéo, hai nút − và +, nút «Xong rồi!», nút nghe lại.
 * `optionCount` là 0: không có lựa chọn rời rạc (số vạch không phải số lựa chọn). Renderer không có đồng hồ hay xếp hạng.
 */
export function numberLineFacts(
  question: NumberLineQuestion | NumberLineStudentQuestion,
  containerWidth: number,
  { includeConfirm = true } = {},
): GameFacts {
  const touchTargets: TouchTarget[] = [
    { id: 'band', width: BAND_WIDTH, height: BAND_HEIGHT },
    { id: 'marker', width: MARKER_HIT_RADIUS * 2, height: MARKER_HIT_RADIUS * 2 },
    { id: 'minusButton', width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
    { id: 'plusButton', width: STEP_BUTTON_WIDTH, height: STEP_BUTTON_HEIGHT },
  ]
  if (question.audioUrl) touchTargets.push({ id: 'audioButton', width: AUDIO_BUTTON_WIDTH, height: AUDIO_BUTTON_HEIGHT })
  if (includeConfirm) touchTargets.push({ id: 'confirmButton', width: CONFIRM_BUTTON_WIDTH, height: CONFIRM_BUTTON_HEIGHT })

  const texts: TextItem[] = [{ id: 'question', text: question.questionText, kind: 'question' }]
  return {
    mechanic: 'NUMBER_LINE',
    stageWidth: STAGE_WIDTH,
    containerWidth,
    touchTargets,
    texts,
    optionCount: 0,
    showsTimer: false,
    showsLiveLeaderboard: false,
  }
}

/** Số vạch của một câu hỏi (để báo cáo; không phải "lựa chọn"). */
export const ticksOf = (question: NumberLineQuestion | NumberLineStudentQuestion): number => tickCount(question)
