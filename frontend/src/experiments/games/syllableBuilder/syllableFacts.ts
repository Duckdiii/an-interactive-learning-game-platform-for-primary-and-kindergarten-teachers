import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH, STAGE_WIDTH } from '../../../games/common/mediaLayout'
import type { GameFacts, TextItem, TouchTarget } from '../../age/validateAgainstProfile'
import { CONFIRM_BUTTON_HEIGHT, CONFIRM_BUTTON_WIDTH, SLOT_BUTTON_HEIGHT, SLOT_WIDTH } from './syllableLayout'
import { SYLLABLE_SLOTS, type SyllableBuilderQuestion, type SyllableBuilderStudentQuestion } from './syllableTypes'

/**
 * Sự kiện của màn SYLLABLE_BUILDER cho `validateAgainstProfile`, lấy từ HẰNG SỐ BỐ CỤC THẬT của renderer. Vùng chạm:
 * sáu nút ▲/▼ (hai nút mỗi ô chọn), nút «Xong rồi!», nút nghe lại (nếu có). Ô giá trị chỉ để xem, không chạm.
 * `optionCount` là 0: mỗi ô chỉ hiện MỘT lựa chọn một lúc (chạm để đổi), không có danh sách lựa chọn cùng hiện.
 */
export function syllableFacts(
  question: SyllableBuilderQuestion | SyllableBuilderStudentQuestion,
  containerWidth: number,
  { includeConfirm = true } = {},
): GameFacts {
  const touchTargets: TouchTarget[] = SYLLABLE_SLOTS.flatMap((slot) => [
    { id: `${slot}Up`, width: SLOT_WIDTH, height: SLOT_BUTTON_HEIGHT },
    { id: `${slot}Down`, width: SLOT_WIDTH, height: SLOT_BUTTON_HEIGHT },
  ])
  if (question.audioUrl) touchTargets.push({ id: 'audioButton', width: AUDIO_BUTTON_WIDTH, height: AUDIO_BUTTON_HEIGHT })
  if (includeConfirm) touchTargets.push({ id: 'confirmButton', width: CONFIRM_BUTTON_WIDTH, height: CONFIRM_BUTTON_HEIGHT })

  const texts: TextItem[] = [{ id: 'question', text: question.questionText, kind: 'question' }]
  return {
    mechanic: 'SYLLABLE_BUILDER',
    stageWidth: STAGE_WIDTH,
    containerWidth,
    touchTargets,
    texts,
    optionCount: 0,
    showsTimer: false,
    showsLiveLeaderboard: false,
  }
}
