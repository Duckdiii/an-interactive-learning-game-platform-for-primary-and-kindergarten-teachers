import type { ComponentType } from 'react'
import type { GameType, Subject } from '../../types/game-dsl.types'
import type { AnswerByType, AnswerResult, StudentQuestionByType } from '../../types/game-student.types'
import type { UiProfile } from '../profile/types'

/**
 * Hợp đồng giữa khung và renderer ở chế độ chơi (SPEC mục 3). Renderer nhận câu hỏi dạng học sinh (không có đáp án), profile và `onSubmit`;
 * nó gọi `onSubmit(answer)` đúng MỘT lần khi trẻ đã trả lời xong, rồi hiện phản hồi theo `AnswerResult` mà khung (qua máy chủ) trả về. Renderer không
 * tự so đáp án. Khung lo đồng hồ, điểm, chuyển câu, âm thanh chung.
 *
 * `profile` đã có trong hợp đồng để các renderer đọc vùng chạm, tự đọc lời nhắc... Renderer cũ (QUIZ, MATCHING) chưa dùng nó; chuyển dần từng renderer
 * khi sửa bố cục.
 */
export interface PlayableRendererProps<T extends GameType = GameType> {
  question: StudentQuestionByType[T]
  profile: UiProfile
  /** Môn học giúp các renderer có phát âm văn bản chọn đúng ngôn ngữ TTS. */
  subject?: Subject
  onSubmit: (answer: AnswerByType[T]) => Promise<AnswerResult>
  /** Khung cung cấp audio khi cần dùng chung với chức năng nghe lại. */
  playAudio?: () => void
  /** Khóa lựa chọn khi hết giờ; nút nghe lại vẫn hoạt động. */
  answerDisabled?: boolean
}

export type PlayableRenderer<T extends GameType = GameType> = ComponentType<PlayableRendererProps<T>>
