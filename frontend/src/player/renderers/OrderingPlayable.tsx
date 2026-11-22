import { useState } from 'react'
import { soundBus } from '../../services/pipeline/soundBus'
import type { AnswerResult } from '../../types/game-student.types'
import { resolveAssetUrl } from '../../utils/assetResolver'
import type { PlayableRendererProps } from './types'

/**
 * Trình dựng trò chơi Sắp xếp (ORDERING) cho học sinh K-5:
 * - Các khối thẻ đồ chơi Toy Blocks / Candy Blocks bo tròn 24px, hiệu ứng 3D vui mắt
 * - Cho phép trẻ chạm vào hai khối để đổi chỗ (tap to swap) hoặc bấm nút mũi tên trái/phải
 * - Mỗi lần di chuyển phát âm thanh bong bóng pop
 * - Nút "Xong rồi!" để nộp bài và nhận phản hồi chấm điểm trực quan
 */
export default function OrderingPlayable({ question, profile, onSubmit }: PlayableRendererProps<'ORDERING'>) {
  const [items, setItems] = useState(() => [...question.steps])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AnswerResult | null>(null)

  const swap = (idxA: number, idxB: number) => {
    if (idxA < 0 || idxA >= items.length || idxB < 0 || idxB >= items.length || idxA === idxB) return
    const next = [...items]
    const temp = next[idxA]
    next[idxA] = next[idxB]
    next[idxB] = temp
    setItems(next)
    soundBus.playPop()
    setSelectedIndex(null)
  }

  const handleCardClick = (index: number) => {
    if (submitting || result !== null) return

    if (selectedIndex === null) {
      setSelectedIndex(index)
      soundBus.playPop()
    } else if (selectedIndex === index) {
      setSelectedIndex(null)
    } else {
      swap(selectedIndex, index)
    }
  }

  const handleMove = (index: number, direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation()
    if (submitting || result !== null) return
    const targetIdx = direction === 'left' ? index - 1 : index + 1
    swap(index, targetIdx)
  }

  const handleSubmit = async () => {
    if (submitting || result !== null) return
    setSubmitting(true)
    try {
      const order = items.map((item) => item.id)
      const res = await onSubmit({ order })
      setResult(res)
      if (res.isCorrect) {
        soundBus.playCorrect()
      } else {
        soundBus.playWrong()
      }
    } catch {
      // Bỏ qua lỗi mạng cấp khung đã xử lý
    } finally {
      setSubmitting(false)
    }
  }

  const correctOrder = Array.isArray(result?.correctAnswer?.order)
    ? (result.correctAnswer.order as string[])
    : null

  return (
    <div className="flex h-full w-full flex-col items-center justify-between p-4 sm:p-6 select-none">
      {/* Tiêu đề / Lời nhắc */}
      <div className="text-center mb-4">
        <h2 className="text-xl sm:text-2xl font-black text-play-ink">
          {question.audioText ?? 'Bé hãy sắp xếp theo thứ tự đúng nhé!'}
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-play-ink-soft mt-1">
          {selectedIndex !== null
            ? '👉 Hãy chạm vào một ô khác để đổi chỗ!'
            : 'Chạm chọn 2 ô để đổi chỗ, hoặc bấm mũi tên ⬅️ ➡️'}
        </p>
      </div>

      {/* Dãy các khối thẻ đồ chơi */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-4xl w-full my-auto py-2">
        {items.map((item, index) => {
          const isSelected = selectedIndex === index
          const isLocked = result !== null
          const assetUrl =
            item.imageUrl ||
            resolveAssetUrl(item.text, item.visualPrompt)

          let borderBgClasses =
            'border-4 border-play-outline bg-play-surface shadow-md hover:scale-[1.02] active:scale-95'
          if (isSelected) {
            borderBgClasses =
              'border-4 border-play-primary ring-4 ring-play-primary/40 bg-play-surface scale-105 shadow-xl -translate-y-1'
          } else if (result) {
            borderBgClasses = result.isCorrect
              ? 'border-4 border-emerald-400 bg-emerald-50/80 shadow-xs'
              : 'border-4 border-rose-300 bg-rose-50/70 shadow-xs'
          }

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              aria-label={`Vị trí ${index + 1}: ${item.text ?? 'Thẻ'}`}
              onClick={() => handleCardClick(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleCardClick(index)
                }
              }}
              style={{
                minWidth: Math.min(profile.tokens.minTouch, 90),
                minHeight: Math.min(profile.tokens.minTouch, 100),
              }}
              className={[
                'relative flex flex-col items-center justify-between rounded-3xl p-3 sm:p-4 transition-all duration-200 cursor-pointer w-28 sm:w-36 md:w-44',
                borderBgClasses,
              ].join(' ')}
            >
              {/* Số thứ tự khối */}
              <div className="flex items-center justify-between w-full">
                <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-play-primary font-black text-white text-xs sm:text-sm shadow-xs">
                  {index + 1}
                </span>

                {/* Các nút mũi tên di chuyển nhanh */}
                {!isLocked && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={(e) => handleMove(index, 'left', e)}
                      aria-label="Di chuyển sang trái"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-play-outline bg-play-surface text-play-ink text-xs font-bold transition hover:bg-play-primary hover:text-white disabled:opacity-20 disabled:pointer-events-none"
                    >
                      ⬅️
                    </button>
                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={(e) => handleMove(index, 'right', e)}
                      aria-label="Di chuyển sang phải"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-play-outline bg-play-surface text-play-ink text-xs font-bold transition hover:bg-play-primary hover:text-white disabled:opacity-20 disabled:pointer-events-none"
                    >
                      ➡️
                    </button>
                  </div>
                )}
              </div>

              {/* Ảnh minh họa vector nếu có */}
              {assetUrl ? (
                <img
                  src={assetUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-12 w-12 sm:h-16 sm:w-16 my-2 object-contain drop-shadow-xs"
                />
              ) : null}

              {/* Chữ mô tả */}
              {item.text ? (
                <span className="text-center font-extrabold text-sm sm:text-base text-play-ink line-clamp-2 leading-tight">
                  {item.text}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Hiển thị đáp án đúng nếu bé xếp sai */}
      {result && !result.isCorrect && correctOrder && (
        <div className="mt-2 text-center rounded-2xl bg-amber-50 border-2 border-amber-300 p-3 max-w-lg w-full">
          <p className="text-xs sm:text-sm font-bold text-amber-900 mb-1">
            💡 Thứ tự đúng là:
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {correctOrder.map((stepId, i) => {
              const matched = question.steps.find((s) => s.id === stepId)
              return (
                <span
                  key={stepId}
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-xs font-bold text-play-ink border border-amber-200 shadow-xs"
                >
                  <strong className="text-play-primary">{i + 1}.</strong> {matched?.text ?? stepId}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Nút xác nhận nộp bài */}
      {result === null && (
        <div className="mt-4 flex items-center justify-center w-full">
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="inline-flex items-center justify-center rounded-2xl px-8 py-3.5 font-display text-lg font-black text-white bg-play-primary border-b-4 border-play-primary-strong shadow-lg hover:brightness-105 active:translate-y-1 active:border-b-0 cursor-pointer transition-all"
          >
            {submitting ? 'Đang kiểm tra...' : 'Xong rồi! ✨'}
          </button>
        </div>
      )}
    </div>
  )
}
