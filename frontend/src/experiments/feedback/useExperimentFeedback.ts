import { useCallback, useMemo, useRef, useState } from 'react'
import { getAudioService, type AudioService } from '../audio/audioService'
import { buildPlan, MIN_RETRIGGER_SECONDS, SOUND_OF_FEEDBACK, type FeedbackKind, type FeedbackPlan } from './feedbackEffects'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export interface ExperimentFeedback {
  /** Loại phản hồi đang/đã phát gần nhất; `null` nếu chưa phát. */
  kind: FeedbackKind | null
  /** Tăng mỗi lần `trigger` (0 = chưa phát); truyền cho `FeedbackOverlay`/`useFeedbackTimeline` để chạy lại. */
  runId: number
  plan: FeedbackPlan | null
  reducedMotion: boolean
  /** Phát âm + khởi động hiệu ứng hình. Gọi từ cử chỉ của người dùng (chạm trả lời) để mở khóa được âm thanh. */
  trigger: (kind: FeedbackKind) => void
}

const defaultNow = () => performance.now()

interface Options {
  /** Mặc định dùng bản dùng chung; truyền `null` để chỉ có hiệu ứng hình. */
  audio?: AudioService | null
  /** Ép giảm chuyển động (ví dụ công tắc trong phòng thử); ngoài ra theo cài đặt hệ điều hành. */
  forceReducedMotion?: boolean
  /** Đồng hồ (ms) để test; mặc định `performance.now()`. */
  now?: () => number
}

/**
 * Phản hồi dùng chung cho các renderer thử nghiệm: đúng, thử lại nhẹ nhàng, hoàn thành. Kết hợp âm tổng hợp
 * (`AudioService`) và hiệu ứng hình có giới hạn nhấp nháy (xem `feedbackEffects.ts`); giảm chuyển động thì chỉ
 * còn vòng sáng tĩnh, âm thanh không đổi.
 *
 * Chạm dồn dập: hiệu ứng HÌNH không được khởi động lại sớm hơn `MIN_RETRIGGER_SECONDS` sau lần khởi động trước
 * (lần chạm đến sớm bị bỏ phần hình, kể cả khi đổi loại phản hồi), để vòng sáng không chớp quá 3 lần/giây
 * (WCAG 2.3.1). Âm thanh vẫn phát theo giới hạn riêng của `AudioService`.
 */
export function useExperimentFeedback({
  audio = getAudioService(),
  forceReducedMotion = false,
  now = defaultNow,
}: Options = {}): ExperimentFeedback {
  const prefersReduced = usePrefersReducedMotion()
  const reducedMotion = forceReducedMotion || prefersReduced
  const [current, setCurrent] = useState<{ kind: FeedbackKind | null; runId: number }>({ kind: null, runId: 0 })
  const lastVisualAt = useRef<number | null>(null)

  const plan = useMemo(() => (current.kind ? buildPlan(current.kind, { reducedMotion }) : null), [current.kind, reducedMotion])

  const trigger = useCallback(
    (kind: FeedbackKind) => {
      if (audio) {
        // Chạm trả lời là cử chỉ hợp lệ: mở khóa (nếu chưa) rồi phát; chưa mở khóa được thì lệnh phát nằm trong hàng đợi.
        void audio.unlock()
        audio.play(SOUND_OF_FEEDBACK[kind])
      }
      const at = now()
      const last = lastVisualAt.current
      if (last !== null && at - last < MIN_RETRIGGER_SECONDS * 1000) return
      lastVisualAt.current = at
      setCurrent((previous) => ({ kind, runId: previous.runId + 1 }))
    },
    [audio, now],
  )

  return { kind: current.kind, runId: current.runId, plan, reducedMotion, trigger }
}
