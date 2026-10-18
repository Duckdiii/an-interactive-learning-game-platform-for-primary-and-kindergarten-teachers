import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MAX_EFFECT_SECONDS, STATIC_HIGHLIGHT_SECONDS } from '../../feedback/feedbackEffects'
import { usePrefersReducedMotion } from '../../feedback/usePrefersReducedMotion'
import { useTheme } from '../../theme/useTheme'
import { buildLottie, type LottieKind } from './lottieAnimations'
import type { LottieEngine, LottiePlayerProps } from './playerTypes'

// Mỗi bộ phát là một gói riêng (nạp lười): chỉ tải thư viện của engine đang dùng.
const LottieWebPlayer = lazy(() => import('./LottieWebPlayer'))
const DotLottiePlayer = lazy(() => import('./DotLottiePlayer'))

export const LOTTIE_OVERLAY_SIZE = 200
/** Chừa thêm sau khi hoạt ảnh dài nhất kết thúc rồi mới gỡ lớp phủ khỏi trang. */
const LINGER_SECONDS = 0.3
/** Chờ nạp thư viện tối đa từng ấy giây (kể từ phản hồi); quá hạn thì gỡ lớp phủ dù chưa sẵn sàng (không treo trang trống). */
const MAX_LOAD_SECONDS = 5

interface FeedbackLottieOverlayProps {
  engine: LottieEngine
  kind: LottieKind
  /** Tăng mỗi lần có phản hồi mới (0 = chưa có); đổi `runId` thì phát lại từ đầu. */
  runId: number
  /** Ép giảm chuyển động (ngoài ra theo cài đặt hệ điều hành). */
  forceReducedMotion?: boolean
  size?: number
  children: ReactNode
}

/**
 * Lớp phủ DOM đặt lên trên một vùng (canvas Konva) để phát hoạt ảnh Lottie phản hồi đúng/sai. Không nhận chạm
 * (`pointer-events: none`) và ẩn với trình đọc màn hình (`aria-hidden`: thông báo vẫn do vùng `role=status` của
 * renderer đảm nhiệm). Hết hoạt ảnh thì gỡ khỏi trang; giảm chuyển động thì chỉ hiện khung cuối, tĩnh, một lúc.
 */
export default function FeedbackLottieOverlay({ engine, kind, runId, forceReducedMotion = false, size = LOTTIE_OVERLAY_SIZE, children }: FeedbackLottieOverlayProps) {
  const { colors } = useTheme()
  const prefersReduced = usePrefersReducedMotion()
  const reducedMotion = forceReducedMotion || prefersReduced
  const animation = useMemo(() => buildLottie(kind, colors), [kind, colors])
  // Lần phản hồi đã hết hạn hiển thị: hiện khi `runId` mới chưa hết hạn (suy ra lúc vẽ, không đặt state trong effect).
  const [expiredRun, setExpiredRun] = useState(0)
  // Lần phản hồi mà bộ phát đã nạp xong: thời gian hiển thị chỉ tính TỪ LÚC ĐÓ (lần đầu phải nạp lười thư viện, dotlottie
  // còn nạp WASM; tính từ lúc có phản hồi thì mạng chậm sẽ cắt mất hoặc không kịp thấy hoạt ảnh).
  const [readyRun, setReadyRun] = useState(0)
  const visible = runId > 0 && expiredRun !== runId
  // Bộ phát hiện tại đã nạp xong khi lần sẵn sàng gần nhất mới hơn lần hết hạn gần nhất (hết hạn = bộ phát bị gỡ). Nhờ vậy
  // phản hồi MỚI khi lớp phủ còn hiện (cùng bộ phát, không có sự kiện nạp thứ hai) vẫn được tính lại thời gian gỡ.
  const playerReady = readyRun > expiredRun

  useEffect(() => {
    if (runId === 0 || !playerReady) return
    const seconds = reducedMotion ? STATIC_HIGHLIGHT_SECONDS : Math.min(MAX_EFFECT_SECONDS, (animation.op as number) / (animation.fr as number))
    const timer = window.setTimeout(() => setExpiredRun(runId), (seconds + LINGER_SECONDS) * 1000)
    return () => window.clearTimeout(timer)
  }, [runId, playerReady, reducedMotion, animation])

  // Hạn chót chờ nạp: không để lớp phủ trống treo mãi nếu thư viện không bao giờ sẵn sàng.
  useEffect(() => {
    if (runId === 0) return
    const timer = window.setTimeout(() => setExpiredRun(runId), MAX_LOAD_SECONDS * 1000)
    return () => window.clearTimeout(timer)
  }, [runId])

  const playerProps: LottiePlayerProps = { animation, replayKey: runId, reducedMotion, size, playOnMount: true, onReady: () => setReadyRun(runId) }
  return (
    <div style={{ position: 'relative' }}>
      {children}
      {visible && (
        <div
          aria-hidden="true"
          data-testid="lottie-overlay"
          style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}
        >
          <Suspense fallback={null}>
            {engine === 'dotlottie' ? <DotLottiePlayer {...playerProps} /> : <LottieWebPlayer {...playerProps} renderer={engine === 'lottie-canvas' ? 'canvas' : 'svg'} />}
          </Suspense>
        </div>
      )}
    </div>
  )
}
