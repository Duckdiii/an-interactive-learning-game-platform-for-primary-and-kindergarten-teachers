import { useEffect, useState } from 'react'
import { useQuestionAudio } from '../../games/common/useQuestionAudio'
import { speakVietnamese } from '../../services/pipeline/assetBank'
import { soundBus } from '../../services/pipeline/soundBus'
import type { AnswerResult } from '../../types/game-student.types'
import { wordCardText } from '../../games/common/optionVisual'
import { resolveAssetUrl } from '../../utils/assetResolver'
import type { PlayableRendererProps } from './types'

/**
 * Trình dựng trò chơi Nghe & Chọn hình ảnh (AUDIO_VISUAL_MATCH) cho mầm non & K-5:
 * - Nút loa hoạt hình lớn 80px ở vị trí trung tâm, kèm hiệu ứng phát sóng âm khi đọc
 * - Lưới thẻ hình minh họa vector OpenMoji sắc nét (Candy Gloss, kích thước tối thiểu 120x120px)
 * - Tự động phát âm thanh khi chạm và phản hồi kết quả trực quan
 */
export default function AudioVisualMatchPlayable({
  question,
  profile,
  onSubmit,
}: PlayableRendererProps<'AUDIO_VISUAL_MATCH'>) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  const playRecordedAudio = useQuestionAudio(question.audioUrl)

  const playPromptAudio = () => {
    setIsPlayingAudio(true)
    if (question.audioUrl) {
      playRecordedAudio()
      setTimeout(() => setIsPlayingAudio(false), 2000)
    } else if (question.audioText) {
      speakVietnamese(question.audioText, () => setIsPlayingAudio(false))
    } else {
      setIsPlayingAudio(false)
    }
  }

  // Tự động phát âm thanh một lần khi câu hỏi xuất hiện
  useEffect(() => {
    const timer = setTimeout(() => {
      playPromptAudio()
    }, 400)
    return () => clearTimeout(timer)
  }, [question.id])

  const handleSelectOption = async (optionId: string) => {
    if (submitting || result !== null) return

    setSelectedId(optionId)
    setSubmitting(true)
    soundBus.playPop()

    try {
      const res = await onSubmit({ selectedOptionId: optionId })
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

  const correctOptionId =
    typeof result?.correctAnswer?.selectedOptionId === 'string'
      ? result.correctAnswer.selectedOptionId
      : null

  return (
    <div className="flex h-full w-full flex-col items-center justify-between p-4 sm:p-6 select-none">
      {/* Vùng phát âm thanh & Tiêu đề */}
      <div className="flex flex-col items-center text-center mt-2 mb-4">
        {/* Nút loa lớn */}
        <button
          type="button"
          onClick={playPromptAudio}
          aria-label={`Nghe lại câu hỏi: ${question.audioText}`}
          className={[
            'relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-play-primary text-white shadow-xl transition-all duration-200 active:scale-95 cursor-pointer border-4 border-white/80',
            isPlayingAudio ? 'ring-8 ring-play-primary/30 scale-105' : 'hover:scale-105',
          ].join(' ')}
        >
          <span className="text-3xl sm:text-4xl" aria-hidden="true">
            {isPlayingAudio ? '🔊' : '🔈'}
          </span>
          {isPlayingAudio && (
            <span className="absolute -inset-1 rounded-full border-2 border-play-primary animate-ping opacity-75" />
          )}
        </button>

        {/* Lời nhắc chữ to rõ */}
        <h2 className="text-xl sm:text-2xl font-black text-play-ink mt-3">
          {question.audioText}
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-play-ink-soft mt-0.5">
          Bấm vào loa để nghe lại · Chạm vào hình đúng nhé!
        </p>
      </div>

      {/* Lưới các thẻ hình ảnh minh họa */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl w-full my-auto justify-items-center">
        {question.options.map((option, idx) => {
          const isSelected = selectedId === option.id
          const isCorrect =
            (result?.isCorrect && isSelected) || correctOptionId === option.id
          const isWrong = result && !result.isCorrect && isSelected

          // Thẻ chữ hiện đúng chữ; không đoán hình theo mã lựa chọn (a, b, c là vị trí, không phải nội dung: "a" từng ra quả táo).
          const word = option.imageUrl ? null : wordCardText(option.visualPrompt)
          const assetUrl = word ? null : option.imageUrl || resolveAssetUrl(option.visualPrompt)

          let cardStyle =
            'border-4 border-play-outline bg-play-surface shadow-md hover:scale-105 active:scale-95'
          if (isCorrect) {
            cardStyle =
              'border-4 border-emerald-400 bg-emerald-50 scale-105 ring-4 ring-emerald-300/50 shadow-lg'
          } else if (isWrong) {
            cardStyle =
              'border-4 border-rose-400 bg-rose-50 scale-95 shadow-xs'
          } else if (isSelected && submitting) {
            cardStyle =
              'border-4 border-play-primary ring-4 ring-play-primary/40 bg-play-surface scale-95'
          }

          return (
            <button
              key={option.id}
              type="button"
              data-option-id={option.id}
              disabled={submitting || result !== null}
              onClick={() => handleSelectOption(option.id)}
              style={{
                minWidth: Math.max(profile.tokens.minTouch, 120),
                minHeight: Math.max(profile.tokens.minTouch, 120),
              }}
              aria-label={`Lựa chọn ${idx + 1}: ${option.visualPrompt}`}
              className={[
                'group relative flex aspect-square w-full max-w-48 flex-col items-center justify-center rounded-3xl p-3 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-play-primary',
                cardStyle,
              ].join(' ')}
            >
              {/* Huy hiệu kết quả */}
              {isCorrect && (
                <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white font-black text-sm shadow-md animate-bounce">
                  ✓
                </div>
              )}
              {isWrong && (
                <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white font-black text-sm shadow-md">
                  ✕
                </div>
              )}

              {/* Ảnh minh họa vector */}
              {assetUrl ? (
                <img
                  src={assetUrl}
                  alt={option.visualPrompt}
                  className="h-20 w-20 sm:h-28 sm:w-28 object-contain transition-transform duration-200 group-hover:scale-110 drop-shadow-sm"
                />
              ) : word ? (
                <span className="text-center font-black text-3xl sm:text-4xl text-play-ink">{word}</span>
              ) : (
                <span className="text-center font-extrabold text-sm sm:text-base text-play-ink">
                  {option.visualPrompt}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Phản hồi sau khi trả lời */}
      <div className="min-h-12 flex items-center justify-center mt-3">
        {result && (
          <p
            className={[
              'text-base sm:text-lg font-black',
              result.isCorrect ? 'text-play-primary' : 'text-amber-800',
            ].join(' ')}
          >
            {result.isCorrect
              ? '🎉 Tuyệt vời! Bé đã chọn rất chính xác!'
              : '🌱 Chưa chính xác rồi. Đáp án đúng có viền xanh nhé!'}
          </p>
        )}
      </div>
    </div>
  )
}
