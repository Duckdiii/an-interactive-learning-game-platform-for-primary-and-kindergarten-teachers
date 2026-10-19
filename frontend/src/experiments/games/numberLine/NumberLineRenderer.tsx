import type { KonvaEventObject } from 'konva/lib/Node'
import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Circle, Group, Layer, Rect, Text } from 'react-konva'
import { measureWrappedTextHeight } from '../../../games/common/measureText'
import { STAGE_WIDTH } from '../../../games/common/mediaLayout'
import QuestionAudioButton from '../../../games/common/QuestionAudioButton'
import ResponsiveStage from '../../../games/common/ResponsiveStage'
import { useQuestionAudio } from '../../../games/common/useQuestionAudio'
import FeedbackOverlay from '../../feedback/FeedbackOverlay'
import { useExperimentFeedback } from '../../feedback/useExperimentFeedback'
import { useTheme } from '../../theme/useTheme'
import {
  createNumberLineState,
  isCorrectValue,
  isLabeled,
  labelEvery,
  moveBy,
  numberLineReducer,
  snapValue,
  tickValues,
  valueToX,
  xToValue,
  type NumberLineScale,
} from './numberLineLogic'
import {
  BAND_HEIGHT,
  BAND_WIDTH,
  BAND_X,
  computeNumberLineLayout,
  CONFIRM_BUTTON_HEIGHT,
  CONFIRM_BUTTON_WIDTH,
  controlsX,
  LABEL_FONT_SIZE,
  LABEL_OFFSET_Y,
  LABEL_WIDTH,
  LINE_LEFT,
  LINE_RIGHT,
  LINE_THICKNESS,
  MARKER_HIT_STROKE,
  MARKER_RADIUS,
  QUESTION_FONT_SIZE,
  QUESTION_WIDTH,
  REVEAL_RING_RADIUS,
  REVEAL_RING_STROKE,
  STEP_BUTTON_HEIGHT,
  STEP_BUTTON_WIDTH,
  TICK_HEIGHT,
  VALUE_BOX_WIDTH,
} from './numberLineLayout'
import type { NumberLineAnswerResult, NumberLineQuestion, NumberLineStudentQuestion } from './numberLineTypes'

/**
 * Prop phụ thuộc `mode` (union) như các renderer khác của dự án:
 * - preview: giáo viên xem thử; `question` có đáp án, renderer tự chấm cục bộ (`isCorrectValue`).
 * - play: học sinh chơi; `question` KHÔNG có đáp án; cha chấm (Backend) và PHẢI trả kết quả (kèm `correctValue` nếu
 *   muốn chỉ vạch đúng khi trẻ sai). Renderer không tự chấm ở mode này.
 * - review: xem lại, khóa sẵn; `selectedValue` bỏ trống khi hết giờ/bỏ qua.
 */
export type NumberLineRendererProps =
  | { mode: 'preview'; question: NumberLineQuestion; onAnswered?: (value: number) => void }
  | {
      mode: 'play'
      question: NumberLineStudentQuestion
      onAnswered: (value: number) => NumberLineAnswerResult | Promise<NumberLineAnswerResult>
    }
  | { mode: 'review'; question: NumberLineQuestion; selectedValue?: number }

/** Ước lượng chiều cao chữ khi không đo được (môi trường không có Canvas): thiên về dư. */
function estimateHeight(text: string, fontSize: number, width: number): number {
  const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.6)))
  return Math.max(1, Math.ceil([...text].length / charsPerLine)) * fontSize * 1.25
}

export default function NumberLineRenderer(props: NumberLineRendererProps) {
  const q = props.question
  // Sửa nội dung câu (thang, vị trí đầu, đáp án) mà giữ id vẫn phải đặt lại, nếu không state cũ nằm ngoài thang mới.
  const content = [q.min, q.max, q.step, q.startValue ?? '', props.mode === 'play' ? '' : `${props.question.target}/${props.question.tolerance}`].join(',')
  const resetKey = `${props.mode}-${q.id}-${content}-${props.mode === 'review' ? (props.selectedValue ?? 'none') : ''}`
  return <NumberLineBoard key={resetKey} {...props} />
}

function NumberLineBoard(props: NumberLineRendererProps) {
  const { question, mode } = props
  const { colors } = useTheme()
  const feedback = useExperimentFeedback()
  const playAudio = useQuestionAudio(question.audioUrl)

  const scale: NumberLineScale = useMemo(
    () => ({ min: question.min, max: question.max, step: question.step }),
    [question.min, question.max, question.step],
  )
  const geometry = { left: LINE_LEFT, right: LINE_RIGHT }
  const ticks = useMemo(() => tickValues(scale), [scale])
  const every = labelEvery(ticks.length)

  const initialValue =
    props.mode === 'review' && props.selectedValue !== undefined
      ? snapValue(props.selectedValue, scale)
      : (question.startValue ?? question.min)
  const [state, dispatch] = useReducer(numberLineReducer, undefined, () =>
    createNumberLineState(initialValue, mode === 'review' ? 'done' : 'idle'),
  )
  // Kết quả chấm. Xem lại: suy ra từ câu hỏi (có đáp án) và giá trị đã chọn.
  const [submitted, setSubmitted] = useState<NumberLineAnswerResult | null>(null)
  const [sendFailed, setSendFailed] = useState(false)
  const reviewResult: NumberLineAnswerResult | null =
    props.mode === 'review' && props.selectedValue !== undefined
      ? {
          isCorrect: isCorrectValue(snapValue(props.selectedValue, scale), props.question.target, props.question.tolerance),
          correctValue: props.question.target,
        }
      : null
  const result = mode === 'review' ? reviewResult : submitted
  // Chỉ chỉ vạch đúng khi trẻ SAI, hoặc xem lại bài không chọn gì (hết giờ): để trẻ học. Đặt đúng rồi thì không hiện
  // vòng (tránh tưởng «gần đúng»), kể cả khi cha vẫn gửi `correctValue`.
  const revealValue = result
    ? result.isCorrect
      ? undefined
      : result.correctValue
    : props.mode === 'review' && props.selectedValue === undefined
      ? props.question.target
      : undefined

  // Kết quả chấm bất đồng bộ chỉ được áp nếu component còn sống (chưa đổi câu/đóng).
  const activeRef = useRef(true)
  // Khóa đồng bộ: hai lần chạm đến trước khi React vẽ lại vẫn chỉ nộp một lần.
  const submitLockRef = useRef(false)
  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])
  const interactive = mode !== 'review' && state.phase === 'idle'

  // ---- kéo ----
  const [dragX, setDragX] = useState<number | null>(null)
  const liveValue = dragX === null ? state.value : xToValue(dragX, scale, geometry)

  // ---- bố cục ----
  const hasAudio = Boolean(question.audioUrl)
  const questionHeight = useMemo(
    () =>
      measureWrappedTextHeight({ text: question.questionText, fontSize: QUESTION_FONT_SIZE, width: QUESTION_WIDTH }) ??
      estimateHeight(question.questionText, QUESTION_FONT_SIZE, QUESTION_WIDTH),
    [question.questionText],
  )
  const layout = computeNumberLineLayout({ hasAudio, questionHeight, showConfirm: mode !== 'review' })

  const set = (value: number) => dispatch({ type: 'set', value })
  const stepBy = (deltaTicks: number) => set(moveBy(state.value, deltaTicks, scale))

  const handleBandTap = (event: KonvaEventObject<Event>) => {
    if (!interactive) return
    const position = event.target.getStage()?.getRelativePointerPosition()
    if (position) set(xToValue(position.x, scale, geometry))
  }

  const finish = (answer: NumberLineAnswerResult) => {
    setSubmitted(answer)
    dispatch({ type: 'submitDone' })
    feedback.trigger(answer.isCorrect ? 'correct' : 'tryAgain')
  }

  const submit = async () => {
    if (props.mode === 'review' || !interactive || submitLockRef.current) return
    submitLockRef.current = true
    const value = state.value
    setSendFailed(false)
    dispatch({ type: 'submitStart' })
    if (props.mode === 'preview') {
      finish({ isCorrect: isCorrectValue(value, props.question.target, props.question.tolerance), correctValue: props.question.target })
      // Gọi trong Promise để lỗi ném đồng bộ lẫn bất đồng bộ của cha đều chỉ được ghi log, không làm hỏng màn.
      new Promise<void>((resolve) => resolve(void props.onAnswered?.(value))).catch((error) => {
        console.error('NumberLineRenderer: onAnswered (preview) bị lỗi', error)
      })
      return
    }
    let answer: NumberLineAnswerResult
    try {
      answer = await props.onAnswered(value)
    } catch (error) {
      if (!activeRef.current) return
      console.error('NumberLineRenderer: onAnswered bị lỗi, mở khóa lại để thử lại', error)
      submitLockRef.current = false
      setSendFailed(true)
      dispatch({ type: 'submitFailed' })
      return
    }
    if (!activeRef.current) return
    // Cha trả sai dạng (không có isCorrect kiểu boolean) coi như chưa nhận được kết quả.
    if (typeof answer?.isCorrect !== 'boolean') {
      console.error('NumberLineRenderer: onAnswered trả kết quả sai dạng', answer)
      submitLockRef.current = false
      setSendFailed(true)
      dispatch({ type: 'submitFailed' })
      return
    }
    finish(answer)
  }

  // ---- màu ----
  const done = state.phase === 'done'
  const markerFill = done && result ? (result.isCorrect ? colors.surfaceCorrect : colors.surfaceTryAgain) : colors.accent
  const markerStroke = done && result ? (result.isCorrect ? colors.lineCorrect : colors.lineTryAgain) : colors.accentBorder
  const lineY = layout.lineY - layout.bandY // toạ độ y trong nhóm dải
  const markerX = dragX ?? valueToX(state.value, scale, geometry)
  const atMin = state.value <= question.min
  const atMax = state.value >= question.max
  const canSubmit = interactive

  const announcement = result
    ? result.isCorrect
      ? 'Đúng rồi!'
      : result.correctValue !== undefined
        ? `Gần đúng rồi. Số đúng là ${result.correctValue}.`
        : 'Chưa đúng rồi, cố gắng lên nhé.'
    : sendFailed
      ? 'Chưa gửi được, bấm Xong rồi để gửi lại nhé.'
      : ''

  return (
    <>
      <ResponsiveStage width={STAGE_WIDTH} height={layout.stageHeight}>
        <Layer>
          {layout.audioY !== null && <QuestionAudioButton y={layout.audioY} onPress={playAudio} />}

          <Text
            text={question.questionText}
            fontSize={QUESTION_FONT_SIZE}
            fill={colors.onBackground}
            x={(STAGE_WIDTH - QUESTION_WIDTH) / 2}
            y={layout.questionY}
            width={QUESTION_WIDTH}
            height={layout.questionHeight}
            align="center"
            verticalAlign="middle"
            listening={false}
          />

          <Group x={BAND_X} y={layout.bandY} onClick={handleBandTap} onTap={handleBandTap}>
            <Rect width={BAND_WIDTH} height={BAND_HEIGHT} cornerRadius={20} fill={colors.surface} stroke={colors.border} strokeWidth={3} />
            <Group x={-BAND_X}>
              <Rect x={LINE_LEFT} y={lineY - LINE_THICKNESS / 2} width={LINE_RIGHT - LINE_LEFT} height={LINE_THICKNESS} cornerRadius={LINE_THICKNESS / 2} fill={colors.border} listening={false} />
              {ticks.map((value, index) => {
                const x = valueToX(value, scale, geometry)
                return (
                  <Group key={value} listening={false}>
                    <Rect x={x - 2} y={lineY - TICK_HEIGHT / 2} width={4} height={TICK_HEIGHT} fill={colors.border} />
                    {isLabeled(index, ticks.length, every) && (
                      <Text
                        text={String(value)}
                        x={x - LABEL_WIDTH / 2}
                        y={lineY + LABEL_OFFSET_Y}
                        width={LABEL_WIDTH}
                        align="center"
                        fontSize={LABEL_FONT_SIZE}
                        fontStyle="bold"
                        fill={colors.text}
                      />
                    )}
                  </Group>
                )
              })}
              {revealValue !== undefined && (
                <Circle
                  x={valueToX(revealValue, scale, geometry)}
                  y={lineY}
                  radius={REVEAL_RING_RADIUS}
                  stroke={colors.lineCorrect}
                  strokeWidth={REVEAL_RING_STROKE}
                  dash={[10, 8]}
                  listening={false}
                />
              )}
              {!(props.mode === 'review' && props.selectedValue === undefined) && (
                <Circle
                  x={markerX}
                  y={lineY}
                  radius={MARKER_RADIUS}
                  fill={markerFill}
                  stroke={markerStroke}
                  strokeWidth={6}
                  hitStrokeWidth={MARKER_HIT_STROKE}
                  draggable={interactive}
                  onDragMove={(event) => {
                    const node = event.target
                    const x = Math.min(LINE_RIGHT, Math.max(LINE_LEFT, node.x()))
                    node.x(x)
                    node.y(lineY)
                    setDragX(x)
                  }}
                  onDragEnd={(event) => {
                    set(xToValue(event.target.x(), scale, geometry))
                    setDragX(null)
                  }}
                />
              )}
            </Group>
          </Group>

          <StepButton x={controlsX().minus} y={layout.controlsY} label="−" disabled={!interactive || atMin} onPress={() => stepBy(-1)} />
          <Group x={controlsX().value} y={layout.controlsY} listening={false}>
            <Rect width={VALUE_BOX_WIDTH} height={STEP_BUTTON_HEIGHT} cornerRadius={20} fill={colors.surface} stroke={colors.border} strokeWidth={3} />
            <Text
              text={String(liveValue)}
              width={VALUE_BOX_WIDTH}
              height={STEP_BUTTON_HEIGHT}
              align="center"
              verticalAlign="middle"
              fontSize={56}
              fontStyle="bold"
              fill={colors.text}
            />
          </Group>
          <StepButton
            x={controlsX().plus}
            y={layout.controlsY}
            label="+"
            disabled={!interactive || atMax}
            onPress={() => stepBy(1)}
          />

          {layout.confirmY !== null && (
            <Group
              x={(STAGE_WIDTH - CONFIRM_BUTTON_WIDTH) / 2}
              y={layout.confirmY}
              onClick={canSubmit ? () => void submit() : undefined}
              onTap={canSubmit ? () => void submit() : undefined}
            >
              <Rect
                width={CONFIRM_BUTTON_WIDTH}
                height={CONFIRM_BUTTON_HEIGHT}
                cornerRadius={20}
                fill={canSubmit ? colors.accent : colors.disabledSurface}
                stroke={canSubmit ? colors.accentBorder : colors.disabledBorder}
                strokeWidth={3}
              />
              <Text
                text={state.phase === 'submitting' ? 'Đang chấm…' : 'Xong rồi!'}
                width={CONFIRM_BUTTON_WIDTH}
                height={CONFIRM_BUTTON_HEIGHT}
                align="center"
                verticalAlign="middle"
                fontSize={32}
                fontStyle="bold"
                fill={canSubmit ? colors.onAccent : colors.onDisabled}
                listening={false}
              />
            </Group>
          )}

          <FeedbackOverlay plan={feedback.plan} runId={feedback.runId} x={BAND_X} y={layout.bandY} width={BAND_WIDTH} height={BAND_HEIGHT} />
        </Layer>
      </ResponsiveStage>

      {/* Lối thay thế cho bàn phím và trình đọc màn hình: canvas không có cây DOM. Chỉ hiện khi được tiêu điểm. */}
      <div className="sr-only focus-within:not-sr-only">
        <label>
          Số trên trục
          <input
            type="range"
            min={question.min}
            max={question.max}
            step={question.step}
            value={state.value}
            disabled={!interactive}
            onChange={(event) => set(Number(event.target.value))}
            aria-valuetext={`Số ${state.value}`}
          />
        </label>
        {mode !== 'review' && (
          <button type="button" disabled={!canSubmit} onClick={() => void submit()}>
            Xong rồi!
          </button>
        )}
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  )
}

interface StepButtonProps {
  x: number
  y: number
  label: string
  disabled: boolean
  onPress: () => void
}

function StepButton({ x, y, label, disabled, onPress }: StepButtonProps) {
  const { colors } = useTheme()
  const press = disabled ? undefined : onPress
  return (
    <Group x={x} y={y} onClick={press} onTap={press}>
      <Rect
        width={STEP_BUTTON_WIDTH}
        height={STEP_BUTTON_HEIGHT}
        cornerRadius={20}
        fill={disabled ? colors.disabledSurface : colors.accent}
        stroke={disabled ? colors.disabledBorder : colors.accentBorder}
        strokeWidth={3}
      />
      <Text
        text={label}
        width={STEP_BUTTON_WIDTH}
        height={STEP_BUTTON_HEIGHT}
        align="center"
        verticalAlign="middle"
        fontSize={64}
        fontStyle="bold"
        fill={disabled ? colors.onDisabled : colors.onAccent}
        listening={false}
      />
    </Group>
  )
}
