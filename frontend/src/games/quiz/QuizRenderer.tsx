import { useEffect, useMemo, useRef, useState } from 'react'
import { Group, Image as KonvaImage, Layer, Rect, Text } from 'react-konva'
import { Howl } from 'howler'
import useImage from 'use-image'
import type { QuizQuestion } from '../../types/game-dsl.types'
import { measureWrappedTextHeight } from '../common/measureText'
import OptionButton from '../common/OptionButton'
import ResponsiveStage from '../common/ResponsiveStage'
import { useFeedback } from '../common/useFeedback'
import {
  AUDIO_BUTTON_HEIGHT,
  AUDIO_BUTTON_WIDTH,
  ILLUSTRATION_SIZE,
  QUESTION_FONT_SIZE,
  QUESTION_TEXT_WIDTH,
  STAGE_WIDTH,
  computeQuizLayout,
} from './quizLayout'

/**
 * Prop phụ thuộc `mode` (union) để sai là lỗi lúc build thay vì lỗi lúc chạy:
 * - preview: GV xem trước; component tự so đáp án cục bộ, `onAnswered` chỉ để thông báo (không cần kết quả).
 * - play: cha lo gọi API chấm và PHẢI trả đúng/sai thật (boolean hoặc Promise<boolean>); thiếu thì ô bị
 *   khoá mà không có feedback. Component KHÔNG tự so `question.correctOptionId` ở mode này.
 * - review: xem lại câu đã làm, khoá sẵn. `selectedOptionId` bỏ trống khi câu hết giờ/bỏ qua.
 */
type QuizRendererProps = { question: QuizQuestion } & (
  | { mode: 'preview'; onAnswered?: (optionId: string) => void }
  | { mode: 'play'; onAnswered: (optionId: string) => boolean | Promise<boolean> }
  | { mode: 'review'; selectedOptionId?: string }
)

function initialLocalState(mode: QuizRendererProps['mode'], selectedOptionId: string | undefined) {
  return {
    chosenId: mode === 'review' ? (selectedOptionId ?? null) : null,
    locked: mode === 'review',
    revealCorrect: mode === 'review',
  }
}

export default function QuizRenderer(props: QuizRendererProps) {
  const { question, mode } = props
  const selectedOptionId = props.mode === 'review' ? props.selectedOptionId : undefined
  const [chosenId, setChosenId] = useState<string | null>(
    () => initialLocalState(mode, selectedOptionId).chosenId,
  )
  const [locked, setLocked] = useState(() => initialLocalState(mode, selectedOptionId).locked)
  const [revealCorrect, setRevealCorrect] = useState(
    () => initialLocalState(mode, selectedOptionId).revealCorrect,
  )
  const { showFeedback } = useFeedback()
  const [illustration, illustrationStatus] = useImage(question.imageUrl ?? '')

  // Đo chiều cao thật của câu hỏi (Konva wrap theo từ nên số dòng khó ước lượng). Đo bằng useMemo,
  // không dùng setState trong effect; đo không được thì layout tự quay về phép ước lượng.
  const measuredQuestionHeight = useMemo(
    () =>
      measureWrappedTextHeight({
        text: question.questionText,
        fontSize: QUESTION_FONT_SIZE,
        width: QUESTION_TEXT_WIDTH,
      }),
    [question.questionText],
  )

  // Chừa chỗ cho ảnh ngay khi có `imageUrl` (tránh bố cục nhảy khi ảnh tải xong); ảnh tải lỗi thì
  // bỏ chỗ đó đi để không để lại khoảng trống.
  const layout = computeQuizLayout({
    hasIllustration: Boolean(question.imageUrl) && illustrationStatus !== 'failed',
    hasAudio: Boolean(question.audioUrl),
    optionCount: question.options.length,
    questionLength: question.questionText.length,
    measuredQuestionHeight,
  })

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

  // Đếm số lần "thế hệ" (tăng mỗi lần đổi câu/mode) để huỷ kết quả `onAnswered` cũ nếu nó resolve
  // sau khi đã chuyển sang câu khác — tránh áp nhầm feedback của câu trước vào câu đang hiển thị.
  // Đặt trong effect (chạy sau khi render commit), không mutate ref ngay trong lúc render.
  const generationRef = useRef(0)
  useEffect(() => {
    generationRef.current += 1
  }, [resetKey])

  const handleSelect = async (optionId: string) => {
    if (locked || props.mode === 'review') return
    const myGeneration = generationRef.current
    setChosenId(optionId)
    setLocked(true)

    if (props.mode === 'preview') {
      const isCorrect = optionId === question.correctOptionId
      setRevealCorrect(true)
      showFeedback(isCorrect)
      // Kiểu `void` không chặn được cha truyền hàm async; bọc lại để Promise bị reject không thành
      // unhandled rejection.
      Promise.resolve(props.onAnswered?.(optionId)).catch((error) => {
        console.error('QuizRenderer: onAnswered (preview) bị lỗi', error)
      })
      return
    }

    // mode === 'play': Backend chấm đúng/sai thật qua component cha; không tự so đáp án ở đây
    // để tránh dựa vào correctOptionId có thể đã lộ trong payload gửi xuống.
    try {
      const result = await props.onAnswered(optionId)
      if (generationRef.current !== myGeneration) return // đã đổi câu/mode, bỏ qua kết quả cũ
      // Kiểu đã bắt buộc boolean; vẫn kiểm tra lúc chạy phòng cha viết bằng JS hoặc ép kiểu sai.
      if (typeof result === 'boolean') {
        setRevealCorrect(true)
        showFeedback(result)
      }
    } catch (error) {
      if (generationRef.current !== myGeneration) return
      console.error('QuizRenderer: onAnswered bị lỗi, mở khoá lại để thử lại', error)
      setChosenId(null)
      setLocked(false)
    }
  }

  // Tạo `Howl` một lần theo `audioUrl` rồi dùng lại cho mọi lần bấm «Nghe lại» (nút không giới hạn số
  // lần bấm, tạo mới mỗi lần sẽ làm bộ nhớ audio tăng dần). Dọn khi đổi câu hoặc đóng component.
  const audioUrl = question.audioUrl
  const audioRef = useRef<Howl | null>(null)
  useEffect(() => {
    if (!audioUrl) return
    const howl = new Howl({ src: [audioUrl] })
    audioRef.current = howl
    return () => {
      howl.unload()
      audioRef.current = null
    }
  }, [audioUrl])

  // stop() trước play(): trẻ bấm liên tục thì phát lại từ đầu, không chồng nhiều giọng đọc lên nhau.
  const playAudio = () => {
    audioRef.current?.stop()
    audioRef.current?.play()
  }

  return (
    <ResponsiveStage width={STAGE_WIDTH} height={layout.stageHeight}>
      <Layer>
        {illustration && layout.illustrationY !== null && (
          <KonvaImage
            image={illustration}
            width={ILLUSTRATION_SIZE}
            height={ILLUSTRATION_SIZE}
            x={(STAGE_WIDTH - ILLUSTRATION_SIZE) / 2}
            y={layout.illustrationY}
            cornerRadius={16}
          />
        )}

        <Text
          text={question.questionText}
          fontSize={QUESTION_FONT_SIZE}
          x={(STAGE_WIDTH - QUESTION_TEXT_WIDTH) / 2}
          y={layout.questionY}
          width={QUESTION_TEXT_WIDTH}
          height={layout.questionHeight}
          align="center"
          verticalAlign="middle"
          listening={false}
        />

        {layout.audioButtonY !== null && (
          <Group
            x={(STAGE_WIDTH - AUDIO_BUTTON_WIDTH) / 2}
            y={layout.audioButtonY}
            onClick={playAudio}
            onTap={playAudio}
          >
            <Rect
              width={AUDIO_BUTTON_WIDTH}
              height={AUDIO_BUTTON_HEIGHT}
              cornerRadius={20}
              fill="#E0F2FE"
              stroke="#0284C7"
              strokeWidth={3}
            />
            <Text
              text="🔊 Nghe lại"
              fontSize={30}
              fontStyle="bold"
              width={AUDIO_BUTTON_WIDTH}
              height={AUDIO_BUTTON_HEIGHT}
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          </Group>
        )}

        {question.options.map((option, index) => (
          <OptionButton
            key={option.id}
            option={option}
            index={index}
            originY={layout.optionsOriginY}
            isSelected={chosenId === option.id}
            isCorrect={revealCorrect && option.id === question.correctOptionId}
            locked={locked}
            onClick={() => handleSelect(option.id)}
          />
        ))}
      </Layer>
    </ResponsiveStage>
  )
}
