import { useRef, useState } from 'react'
import { soundBus } from '../../services/pipeline/soundBus'
import type { AnswerResult } from '../../types/game-student.types'
import { deduceThemeFromText, resolveAssetUrl } from '../../utils/assetResolver'
import type { PlayableRendererProps } from './types'

/**
 * Trình dựng trò chơi Tìm mục tiêu trong tranh (SPOT_THE_TARGET) cho K-5:
 * - Hiển thị bức tranh thế giới sống động (Theme Background hoặc Illustration)
 * - Lời nhắc tìm kiếm có biểu tượng kính lúp 🔍
 * - Bé chạm trực tiếp vào bức tranh tại vị trí mục tiêu
 * - Khi chạm đúng: hiệu ứng ngôi sao lấp lánh và âm thanh chiến thắng
 * - Khi chạm sai: hiển thị vị trí đã chạm và khoanh vùng vị trí đáp án đúng
 */
export default function SpotTheTargetPlayable({
  question,
  onSubmit,
}: PlayableRendererProps<'SPOT_THE_TARGET'>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [clickCoord, setClickCoord] = useState<{ x: number; y: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AnswerResult | null>(null)

  // Suy luận ảnh nền phù hợp theo chủ đề nếu câu hỏi chưa gắn imageUrl
  const deduced = deduceThemeFromText(
    `${question.targetDescription ?? ''} ${question.visualPrompt ?? ''}`
  )
  const backgroundUrl =
    (question as { imageUrl?: string }).imageUrl ||
    deduced.background ||
    '/assets/themes/farm/bg-farm.svg'

  const targetIcon = resolveAssetUrl(question.targetDescription)

  const handleContainerClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (submitting || result !== null) return

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const width = rect.width > 0 ? rect.width : 100
    const height = rect.height > 0 ? rect.height : 100
    const clientX = typeof e.clientX === 'number' ? e.clientX : 50
    const clientY = typeof e.clientY === 'number' ? e.clientY : 50
    const rawX = (clientX - (rect.left || 0)) / width
    const rawY = (clientY - (rect.top || 0)) / height
    const x = Number.isFinite(rawX) ? Math.max(0, Math.min(1, rawX)) : 0.5
    const y = Number.isFinite(rawY) ? Math.max(0, Math.min(1, rawY)) : 0.5

    setClickCoord({ x, y })
    setSubmitting(true)
    soundBus.playPop()

    try {
      const res = await onSubmit({ x, y })
      setResult(res)
      if (res.isCorrect) {
        soundBus.playCorrect()
      } else {
        soundBus.playWrong()
      }
    } catch {
      // Khung xử lý lỗi mạng
    } finally {
      setSubmitting(false)
    }
  }

  // Toạ độ vùng đúng từ máy chủ sau khi chấm
  const correctRegion = result?.correctAnswer as
    | { x: number; y: number; radius: number }
    | undefined

  return (
    <div className="flex h-full w-full flex-col items-center justify-between p-3 sm:p-5 select-none">
      {/* Tiêu đề & Lời nhắc tìm kiếm */}
      <div className="flex items-center gap-3 bg-play-surface px-5 py-2.5 rounded-2xl border-2 border-play-outline shadow-sm mb-3">
        <span className="text-2xl sm:text-3xl" aria-hidden="true">
          🔍
        </span>
        <div className="text-left">
          <h2 className="text-base sm:text-xl font-black text-play-ink">
            Bé hãy tìm: <span className="text-play-primary">{question.targetDescription}</span>
          </h2>
          <p className="text-xs font-semibold text-play-ink-soft">
            Chạm vào đúng vị trí mục tiêu trong bức tranh nhé!
          </p>
        </div>
        {targetIcon && (
          <img
            src={targetIcon}
            alt=""
            aria-hidden="true"
            className="h-9 w-9 sm:h-11 sm:w-11 object-contain ml-2 drop-shadow-xs"
          />
        )}
      </div>

      {/* Khung tranh tương tác */}
      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        aria-label={`Bức tranh tìm kiếm ${question.targetDescription}`}
        onClick={handleContainerClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            // Hỗ trợ trợ năng bàn phím: mặc định nhắm vào tâm
            void onSubmit({ x: 0.5, y: 0.5 })
          }
        }}
        className="relative aspect-[16/9] w-full max-w-4xl rounded-3xl overflow-hidden border-4 border-play-outline shadow-xl cursor-crosshair bg-play-surface my-auto select-none"
      >
        {/* Ảnh nền thế giới */}
        <img
          src={backgroundUrl}
          alt=""
          className="h-full w-full object-cover pointer-events-none"
        />

        {/* Điểm bé vừa chạm */}
        {clickCoord && (
          <div
            style={{
              left: `${clickCoord.x * 100}%`,
              top: `${clickCoord.y * 100}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
          >
            {result?.isCorrect ? (
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-emerald-400/90 text-white font-black text-2xl shadow-xl ring-4 ring-emerald-200 animate-ping duration-700">
                ⭐
              </div>
            ) : (
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-rose-500 text-white font-black text-lg shadow-md ring-2 ring-white">
                ✕
              </div>
            )}
          </div>
        )}

        {/* Vòng khoanh đáp án đúng nếu bé chạm sai */}
        {result && !result.isCorrect && correctRegion && (
          <div
            style={{
              left: `${correctRegion.x * 100}%`,
              top: `${correctRegion.y * 100}%`,
              width: `${Math.max(correctRegion.radius * 2 * 100, 16)}%`,
              height: `${Math.max(correctRegion.radius * 2 * 100, 16)}%`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-dashed border-emerald-400 bg-emerald-300/30 animate-pulse pointer-events-none z-10"
          />
        )}
      </div>

      {/* Thanh phản hồi kết quả */}
      <div className="min-h-11 flex items-center justify-center mt-2">
        {result && (
          <p
            className={[
              'text-base sm:text-lg font-black',
              result.isCorrect ? 'text-play-primary' : 'text-amber-800',
            ].join(' ')}
          >
            {result.isCorrect
              ? '✨ Giỏi quá! Bé đã tìm thấy mục tiêu rồi!'
              : '🌱 Chưa đúng chỗ rồi. Hãy nhìn vị trí khoanh viền xanh nhé!'}
          </p>
        )}
      </div>
    </div>
  )
}
