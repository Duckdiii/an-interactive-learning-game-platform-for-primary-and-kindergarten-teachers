import { AUDIO_BUTTON_HEIGHT, AUDIO_BUTTON_WIDTH, STAGE_WIDTH } from '../../../games/common/mediaLayout'
import type { GameFacts, TextItem, TouchTarget } from '../../age/validateAgainstProfile'
import { SCENE_HEIGHT, SCENE_WIDTH } from './prepositionGeometry'
import { CONFIRM_BUTTON_HEIGHT, CONFIRM_BUTTON_WIDTH } from './prepositionLayout'
import type { PrepositionSceneQuestion, PrepositionSceneStudentQuestion } from './prepositionTypes'

/**
 * Sự kiện của màn PREPOSITION_SCENE cho `validateAgainstProfile`, lấy từ HẰNG SỐ BỐ CỤC THẬT. Vùng chạm: cả cảnh
 * (chạm để đặt vật), chính vật (kéo), nút «Done!», nút nghe lại (nếu có). `optionCount` là 0: không có lựa chọn rời rạc.
 */
export function prepositionFacts(
  question: PrepositionSceneQuestion | PrepositionSceneStudentQuestion,
  containerWidth: number,
  { includeConfirm = true } = {},
): GameFacts {
  const touchTargets: TouchTarget[] = [
    { id: 'scene', width: SCENE_WIDTH, height: SCENE_HEIGHT },
    { id: 'item', width: question.item.width, height: question.item.height },
  ]
  if (question.audioUrl) touchTargets.push({ id: 'audioButton', width: AUDIO_BUTTON_WIDTH, height: AUDIO_BUTTON_HEIGHT })
  if (includeConfirm) touchTargets.push({ id: 'confirmButton', width: CONFIRM_BUTTON_WIDTH, height: CONFIRM_BUTTON_HEIGHT })

  const texts: TextItem[] = [{ id: 'question', text: question.instruction, kind: 'question' }]
  return {
    mechanic: 'PREPOSITION_SCENE',
    stageWidth: STAGE_WIDTH,
    containerWidth,
    touchTargets,
    texts,
    optionCount: 0,
    showsTimer: false,
    showsLiveLeaderboard: false,
  }
}
