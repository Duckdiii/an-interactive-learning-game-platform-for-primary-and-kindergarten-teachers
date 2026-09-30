import { useState } from 'react'
import { Group, Image as KonvaImage, Layer, Rect, Text } from 'react-konva'
import { Howl } from 'howler'
import useImage from 'use-image'
import type { QuizQuestion } from '../../types/game-dsl.types'
import OptionButton from '../common/OptionButton'
import ResponsiveStage from '../common/ResponsiveStage'
import { useFeedback } from '../common/useFeedback'

const STAGE_WIDTH = 800
const STAGE_HEIGHT = 700
const AUDIO_BUTTON_WIDTH = 200
const AUDIO_BUTTON_HEIGHT = 64
const ILLUSTRATION_SIZE = 140

interface QuizRendererProps {
  question: QuizQuestion
  mode: 'preview' | 'play' | 'review'
  /** Bắt buộc khi mode='review' — đáp án học sinh đã chọn trước đó. */
  selectedOptionId?: string
  /**
   * preview: gọi lên cha sau khi đã tự so đáp án cục bộ, không cần giá trị trả về.
   * play: cha lo gọi API, trả về đúng/sai thật (boolean) hoặc Promise<boolean> để QuizRenderer
   * hiện feedback đúng lúc; component KHÔNG tự so `question.correctOptionId` khi play.
   */
  onAnswered?: (optionId: string) => void | boolean | Promise<boolean>
}

function initialLocalState(mode: QuizRendererProps['mode'], selectedOptionId: string | undefined) {
  return {
    chosenId: mode === 'review' ? (selectedOptionId ?? null) : null,
    locked: mode === 'review',
    revealCorrect: mode === 'review',
  }
}

export default function QuizRenderer({ question, mode, selectedOptionId, onAnswered }: QuizRendererProps) {
  const [chosenId, setChosenId] = useState<string | null>(
    () => initialLocalState(mode, selectedOptionId).chosenId,
  )
  const [locked, setLocked] = useState(() => initialLocalState(mode, selectedOptionId).locked)
  const [revealCorrect, setRevealCorrect] = useState(
    () => initialLocalState(mode, selectedOptionId).revealCorrect,
  )
  const { showFeedback } = useFeedback()
  const [illustration] = useImage(question.imageUrl ?? '')

  // Component có thể được cha tái sử dụng cho câu khác hoặc đổi mode mà không unmount (ví dụ GV bấm
  // đổi tab Edit/Preview trong WorkspaceEditor) — phải tự đồng bộ lại trạng thái theo props mới.
  // Cập nhật ngay trong lúc render (theo đúng pattern React khuyến nghị để "reset state khi prop
  // đổi") thay vì trong useEffect, để tránh 1 lượt render thừa sau khi mount/đổi prop.
  const resetKey = `${mode}-${question.id}-${selectedOptionId ?? ''}`
  const [lastResetKey, setLastResetKey] = useState(resetKey)
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey)
    const next = initialLocalState(mode, selectedOptionId)
    setChosenId(next.chosenId)
    setLocked(next.locked)
    setRevealCorrect(next.revealCorrect)
  }

  const handleSelect = async (optionId: string) => {
    if (locked) return
    setChosenId(optionId)
    setLocked(true)

    if (mode === 'preview') {
      const isCorrect = optionId === question.correctOptionId
      setRevealCorrect(true)
      showFeedback(isCorrect)
      onAnswered?.(optionId)
      return
    }

    // mode === 'play': Backend chấm đúng/sai thật qua component cha; không tự so đáp án ở đây
    // để tránh dựa vào correctOptionId có thể đã lộ trong payload gửi xuống.
    const result = await onAnswered?.(optionId)
    if (typeof result === 'boolean') {
      setRevealCorrect(true)
      showFeedback(result)
    }
  }

  const playAudio = () => {
    if (!question.audioUrl) return
    new Howl({ src: [question.audioUrl] }).play()
  }

  return (
    <ResponsiveStage width={STAGE_WIDTH} height={STAGE_HEIGHT}>
      <Layer>
        {illustration && (
          <KonvaImage
            image={illustration}
            width={ILLUSTRATION_SIZE}
            height={ILLUSTRATION_SIZE}
            x={(STAGE_WIDTH - ILLUSTRATION_SIZE) / 2}
            y={20}
            cornerRadius={16}
          />
        )}

        <Text
          text={question.questionText}
          fontSize={32}
          x={40}
          y={illustration ? 180 : 40}
          width={STAGE_WIDTH - 80}
          align="center"
        />

        {question.audioUrl && (
          <Group
            x={(STAGE_WIDTH - AUDIO_BUTTON_WIDTH) / 2}
            y={illustration ? 240 : 100}
            onClick={playAudio}
            onTap={playAudio}
          >
            <Rect
              width={AUDIO_BUTTON_WIDTH}
              height={AUDIO_BUTTON_HEIGHT}
              cornerRadius={12}
              fill="#E0F2FE"
              stroke="#0284C7"
              strokeWidth={2}
            />
            <Text
              text="🔊 Nghe lại"
              fontSize={20}
              width={AUDIO_BUTTON_WIDTH}
              height={AUDIO_BUTTON_HEIGHT}
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          </Group>
        )}

        <Group y={illustration ? 60 : 0}>
          {question.options.map((option, index) => (
            <OptionButton
              key={option.id}
              option={option}
              index={index}
              isSelected={chosenId === option.id}
              isCorrect={revealCorrect && option.id === question.correctOptionId}
              locked={locked}
              onClick={() => handleSelect(option.id)}
            />
          ))}
        </Group>
      </Layer>
    </ResponsiveStage>
  )
}
