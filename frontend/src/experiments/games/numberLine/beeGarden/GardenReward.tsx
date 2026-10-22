import { useEffect, useRef } from 'react'
import { resolveImage } from '../../../assets/imageResolver/resolveImage'
import { GARDEN_COLORS } from './beeGardenColors'
import { FRAME_ASPECT, FRAME_INSET_PERCENT } from './beeGardenGeometry'
import GardenButton from './GardenButton'
import { flowerKeyword, PROGRESS_HONEY, PROGRESS_SEEDLING, PROGRESS_UNIT } from './gardenProgress'
import type { ButtonTone } from './gardenUi'

interface GardenRewardProps {
  /** Mỗi phần tử: `true` đúng ngay lần đầu (hoa nở), còn lại là cây non chưa nở. */
  earned: readonly (boolean | undefined)[]
  total: number
  onRestart: () => void
  tone: ButtonTone
  /** Cạnh ngắn nhất của vùng chạm (px) theo hồ sơ độ tuổi. */
  minPx: number
  reducedMotion: boolean
}

/** Ảnh trôi lơ lửng nhẹ (Web Animations, vô hạn); giảm chuyển động hoặc không có `animate` thì đứng yên. */
function Floating({ src, size, delay, reducedMotion, className }: { src: string; size: number; delay: number; reducedMotion: boolean; className: string }) {
  const ref = useRef<HTMLImageElement | null>(null)
  useEffect(() => {
    const element = ref.current
    if (reducedMotion || !element || typeof element.animate !== 'function') return
    const animation = element.animate(
      [{ transform: 'translateY(0) rotate(-4deg)' }, { transform: 'translateY(-12px) rotate(4deg)' }, { transform: 'translateY(0) rotate(-4deg)' }],
      { duration: 3200, delay, iterations: Infinity, easing: 'ease-in-out' },
    )
    return () => animation.cancel()
  }, [reducedMotion, delay])
  return <img ref={ref} src={src} alt="" width={size} height={size} className={className} />
}

/**
 * Màn kết thúc: vườn cuối lượt. Mỗi câu đúng ngay lần đầu là một bông hoa nở (loài khác nhau), câu chưa đúng là cây non; ong và bướm bay lơ lửng
 * (cảnh càng nhiều hoa càng tươi), mỗi bông hoa đổi được một hũ mật. Văn bản nằm trong `role="status"` để trình đọc màn hình đọc kết quả.
 */
export default function GardenReward({ earned, total, onRestart, tone, minPx, reducedMotion }: GardenRewardProps) {
  const correct = Array.from({ length: total }, (_, index) => earned[index] === true)
  const count = correct.filter(Boolean).length
  const honey = resolveImage(PROGRESS_HONEY).src
  return (
    <div
      className="relative flex flex-col items-center justify-center gap-4 rounded-3xl px-4 pb-6 pt-20 text-center sm:pt-8"
      role="status"
      style={{ marginInline: `${FRAME_INSET_PERCENT}%`, aspectRatio: FRAME_ASPECT, background: `linear-gradient(180deg, ${GARDEN_COLORS.skyTop} 0%, ${GARDEN_COLORS.skyBottom} 62%, ${GARDEN_COLORS.hillBack} 62%, ${GARDEN_COLORS.hillFront} 100%)` }}
    >
      {/* Càng nhiều hoa nở thì càng nhiều bướm: ít nhất một con ong, bướm thêm theo số hoa (tối đa ba). */}
      <Floating src={resolveImage('con ong').src} size={64} delay={0} reducedMotion={reducedMotion} className="absolute left-4 top-4" />
      {count >= 1 && <Floating src={resolveImage('con bướm').src} size={48} delay={600} reducedMotion={reducedMotion} className="absolute right-6 top-6" />}
      {count >= 3 && <Floating src={resolveImage('con bướm').src} size={40} delay={1400} reducedMotion={reducedMotion} className="absolute right-24 top-14 hidden sm:block" />}
      {count >= 5 && <Floating src={resolveImage('con bướm').src} size={36} delay={2000} reducedMotion={reducedMotion} className="absolute left-24 top-12 hidden sm:block" />}
      <p className="text-3xl font-extrabold" style={{ color: GARDEN_COLORS.ink }}>
        Giỏi quá! Bé được {count} / {total} {PROGRESS_UNIT}
      </p>
      <div className="flex flex-wrap items-end justify-center gap-2 pt-2" aria-hidden="true">
        {correct.map((bloomed, index) => (
          <img key={index} src={resolveImage(bloomed ? flowerKeyword(index) : PROGRESS_SEEDLING).src} alt="" width={bloomed ? 72 : 56} height={bloomed ? 72 : 56} style={{ opacity: bloomed ? 1 : 0.7 }} />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1" style={{ color: GARDEN_COLORS.ink }}>
        {count > 0 ? (
          <>
            {Array.from({ length: count }, (_, index) => (
              <img key={index} src={honey} alt="" width={36} height={36} aria-hidden="true" />
            ))}
            <span className="ml-2 text-xl font-extrabold">Ong thu được {count} hũ mật</span>
          </>
        ) : (
          <span className="text-xl font-extrabold">Mình chơi lại để hoa nở nhé!</span>
        )}
      </div>
      <GardenButton tone={tone} minPx={minPx} onClick={onRestart}>
        Chơi lại
      </GardenButton>
    </div>
  )
}
