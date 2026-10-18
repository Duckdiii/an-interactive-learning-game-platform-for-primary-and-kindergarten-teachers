import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Group, Layer, Rect, Text } from 'react-konva'
import { measureWrappedTextHeight } from '../../../games/common/measureText'
import { STAGE_WIDTH } from '../../../games/common/mediaLayout'
import QuestionAudioButton from '../../../games/common/QuestionAudioButton'
import ResponsiveStage from '../../../games/common/ResponsiveStage'
import { useQuestionAudio } from '../../../games/common/useQuestionAudio'
import FeedbackOverlay from '../../feedback/FeedbackOverlay'
import { useExperimentFeedback } from '../../feedback/useExperimentFeedback'
import { useTheme } from '../../theme/useTheme'
import {
  COMPOSED_FONT_SIZE,
  COMPOSED_HEIGHT,
  COMPOSED_WIDTH,
  computeSyllableLayout,
  CONFIRM_BUTTON_HEIGHT,
  CONFIRM_BUTTON_WIDTH,
  MESSAGE_FONT_SIZE,
  MESSAGE_HEIGHT,
  MESSAGE_WIDTH,
  QUESTION_FONT_SIZE,
  QUESTION_WIDTH,
  SLOT_BUTTON_HEIGHT,
  SLOT_VALUE_HEIGHT,
  SLOT_WIDTH,
  slotParts,
  slotX,
} from './syllableLayout'
import {
  createSyllableState,
  currentSyllable,
  initialSelection,
  isCorrectSyllable,
  NO_ONSET_LABEL,
  selectedParts,
  selectionOf,
  syllableReducer,
} from './syllableLogic'
import {
  SYLLABLE_SLOTS,
  type SyllableAnswerResult,
  type SyllableBuilderQuestion,
  type SyllableBuilderStudentQuestion,
  type SyllableSlot,
} from './syllableTypes'
import { SPELLING_HINT, spellingProblem, TONE_LABEL, type SyllableParts } from './vietnameseSyllable'

/**
 * Prop phụ thuộc `mode` (union) như các renderer khác của dự án:
 * - preview: giáo viên xem thử; `question` có đáp án, renderer tự chấm cục bộ (so tiếng sau NFC).
 * - play: học sinh chơi; `question` KHÔNG có đáp án; cha chấm (Backend) và PHẢI trả kết quả (kèm `correctSyllable`
 *   nếu muốn chỉ tiếng đúng khi trẻ sai). Renderer không tự chấm ở mode này.
 * - review: xem lại, khóa sẵn; `selectedParts` bỏ trống khi hết giờ/bỏ qua.
 */
export type SyllableBuilderRendererProps =
  | { mode: 'preview'; question: SyllableBuilderQuestion; onAnswered?: (syllable: string) => void }
  | {
      mode: 'play'
      question: SyllableBuilderStudentQuestion
      onAnswered: (syllable: string) => SyllableAnswerResult | Promise<SyllableAnswerResult>
    }
  | { mode: 'review'; question: SyllableBuilderQuestion; selectedParts?: SyllableParts }

/** Ước lượng chiều cao chữ khi không đo được (môi trường không có Canvas): thiên về dư. */
function estimateHeight(text: string, fontSize: number, width: number): number {
  const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.6)))
  return Math.max(1, Math.ceil([...text].length / charsPerLine)) * fontSize * 1.25
}

const SLOT_NAME: Record<SyllableSlot, string> = { onset: 'Âm đầu', rhyme: 'Vần', tone: 'Dấu thanh' }

function labelOf(slot: SyllableSlot, value: string): string {
  if (slot === 'onset') return value === '' ? NO_ONSET_LABEL : value
  if (slot === 'tone') return TONE_LABEL[value as keyof typeof TONE_LABEL] ?? value
  return value
}

export default function SyllableBuilderRenderer(props: SyllableBuilderRendererProps) {
  const q = props.question
  // Sửa nội dung câu (lựa chọn, đáp án) mà giữ id vẫn phải đặt lại, nếu không chỉ số cũ trỏ sai lựa chọn.
  const content = [q.onsets.join('/'), q.rhymes.join('/'), q.tones.join('/'), q.toneStyle ?? '', props.mode === 'play' ? '' : props.question.target].join('|')
  const selected = props.mode === 'review' && props.selectedParts ? JSON.stringify(props.selectedParts) : ''
  return <SyllableBoard key={`${props.mode}-${q.id}-${content}-${selected}`} {...props} />
}

function SyllableBoard(props: SyllableBuilderRendererProps) {
  const { question, mode } = props
  const { colors } = useTheme()
  const feedback = useExperimentFeedback()
  const playAudio = useQuestionAudio(question.audioUrl)

  const lists = { onset: question.onsets, rhyme: question.rhymes, tone: question.tones as string[] }
  const [state, dispatch] = useReducer(syllableReducer, undefined, () =>
    props.mode === 'review' && props.selectedParts
      ? createSyllableState(selectionOf(question, props.selectedParts), 'done')
      : createSyllableState(initialSelection(), mode === 'review' ? 'done' : 'idle'),
  )
  const noAnswer = props.mode === 'review' && !props.selectedParts

  const parts = selectedParts(question, state.selection)
  const composed = currentSyllable(question, state.selection)

  // Kết quả chấm. Xem lại: suy ra từ câu hỏi (có đáp án) và tiếng đã ghép.
  const [submitted, setSubmitted] = useState<SyllableAnswerResult | null>(null)
  const [sendFailed, setSendFailed] = useState(false)
  const reviewResult: SyllableAnswerResult | null =
    props.mode === 'review' && !noAnswer
      ? { isCorrect: isCorrectSyllable(composed, props.question.target), correctSyllable: props.question.target }
      : null
  const result = mode === 'review' ? reviewResult : submitted
  const revealSyllable = result?.correctSyllable ?? (noAnswer && props.mode === 'review' ? props.question.target : undefined)

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
  const done = state.phase === 'done'

  // ---- bố cục ----
  const questionHeight = useMemo(
    () =>
      measureWrappedTextHeight({ text: question.questionText, fontSize: QUESTION_FONT_SIZE, width: QUESTION_WIDTH }) ??
      estimateHeight(question.questionText, QUESTION_FONT_SIZE, QUESTION_WIDTH),
    [question.questionText],
  )
  const layout = computeSyllableLayout({ hasAudio: Boolean(question.audioUrl), questionHeight, showConfirm: mode !== 'review' })
  const part = slotParts()

  const cycle = (slot: SyllableSlot, delta: number) => dispatch({ type: 'cycle', slot, delta, count: lists[slot].length })

  const finish = (answer: SyllableAnswerResult) => {
    setSubmitted(answer)
    dispatch({ type: 'submitDone' })
    feedback.trigger(answer.isCorrect ? 'correct' : 'tryAgain')
  }

  const submit = async () => {
    if (props.mode === 'review' || !interactive || composed === '' || submitLockRef.current) return
    submitLockRef.current = true
    setSendFailed(false)
    dispatch({ type: 'submitStart' })
    if (props.mode === 'preview') {
      finish({ isCorrect: isCorrectSyllable(composed, props.question.target), correctSyllable: props.question.target })
      // Gọi trong Promise để lỗi ném đồng bộ lẫn bất đồng bộ của cha đều chỉ được ghi log, không làm hỏng màn.
      new Promise<void>((resolve) => resolve(void props.onAnswered?.(composed))).catch((error) => {
        console.error('SyllableBuilderRenderer: onAnswered (preview) bị lỗi', error)
      })
      return
    }
    let answer: SyllableAnswerResult
    try {
      answer = await props.onAnswered(composed)
    } catch (error) {
      if (!activeRef.current) return
      console.error('SyllableBuilderRenderer: onAnswered bị lỗi, mở khóa lại để thử lại', error)
      submitLockRef.current = false
      setSendFailed(true)
      dispatch({ type: 'submitFailed' })
      return
    }
    if (!activeRef.current) return
    // Cha trả sai dạng (không có isCorrect kiểu boolean) coi như chưa nhận được kết quả.
    if (typeof answer?.isCorrect !== 'boolean') {
      console.error('SyllableBuilderRenderer: onAnswered trả kết quả sai dạng', answer)
      submitLockRef.current = false
      setSendFailed(true)
      dispatch({ type: 'submitFailed' })
      return
    }
    finish(answer)
  }

  // ---- thông điệp dưới ô ghép: gợi ý chính tả khi đang ghép, tiếng đúng khi đã chấm sai ----
  // Gợi ý chính tả chỉ ở preview: ở play nó có thể lộ đáp án (ví dụ chọn giữa c và k).
  const problem = interactive && mode === 'preview' ? spellingProblem(parts) : null
  const message = result
    ? result.isCorrect
      ? 'Giỏi quá!'
      : result.correctSyllable !== undefined
        ? `Tiếng đúng là «${result.correctSyllable}».`
        : 'Chưa đúng rồi, cố gắng lên nhé.'
    : noAnswer && revealSyllable !== undefined
      ? `Tiếng đúng là «${revealSyllable}».`
      : problem
        ? SPELLING_HINT[problem]
        : sendFailed
          ? 'Chưa gửi được, bấm Xong rồi để gửi lại nhé.'
          : ''

  // ---- màu ----
  const composedFill = done && result ? (result.isCorrect ? colors.surfaceCorrect : colors.surfaceTryAgain) : colors.surface
  const composedStroke = done && result ? (result.isCorrect ? colors.lineCorrect : colors.lineTryAgain) : colors.border
  const canSubmit = interactive && composed !== ''

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

          <Group x={(STAGE_WIDTH - COMPOSED_WIDTH) / 2} y={layout.composedY} listening={false}>
            <Rect width={COMPOSED_WIDTH} height={COMPOSED_HEIGHT} cornerRadius={20} fill={composedFill} stroke={composedStroke} strokeWidth={4} />
            <Text
              text={noAnswer ? '…' : composed === '' ? '…' : composed}
              width={COMPOSED_WIDTH}
              height={COMPOSED_HEIGHT}
              align="center"
              verticalAlign="middle"
              fontSize={COMPOSED_FONT_SIZE}
              fontStyle="bold"
              fill={colors.text}
            />
          </Group>

          <Text
            text={message}
            x={(STAGE_WIDTH - MESSAGE_WIDTH) / 2}
            y={layout.messageY}
            width={MESSAGE_WIDTH}
            height={MESSAGE_HEIGHT}
            align="center"
            verticalAlign="middle"
            fontSize={MESSAGE_FONT_SIZE}
            fill={colors.onBackground}
            listening={false}
          />

          {SYLLABLE_SLOTS.map((slot, index) => (
            <Group key={slot} x={slotX(index)} y={layout.slotsY}>
              <SlotButton y={part.up} label="▲" disabled={!interactive} onPress={() => cycle(slot, -1)} />
              <Group y={part.value} listening={false}>
                <Rect width={SLOT_WIDTH} height={SLOT_VALUE_HEIGHT} cornerRadius={20} fill={colors.surface} stroke={colors.border} strokeWidth={3} />
                <Text
                  text={labelOf(slot, lists[slot][Math.min(state.selection[slot], lists[slot].length - 1)] ?? '')}
                  width={SLOT_WIDTH}
                  height={SLOT_VALUE_HEIGHT}
                  align="center"
                  verticalAlign="middle"
                  fontSize={slot === 'tone' ? 28 : 44}
                  fontStyle="bold"
                  fill={colors.text}
                />
              </Group>
              <SlotButton y={part.down} label="▼" disabled={!interactive} onPress={() => cycle(slot, 1)} />
            </Group>
          ))}

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

          <FeedbackOverlay plan={feedback.plan} runId={feedback.runId} x={(STAGE_WIDTH - COMPOSED_WIDTH) / 2} y={layout.composedY} width={COMPOSED_WIDTH} height={COMPOSED_HEIGHT} />
        </Layer>
      </ResponsiveStage>

      {/* Lối thay thế cho bàn phím và trình đọc màn hình: canvas không có cây DOM. Chỉ hiện khi được tiêu điểm. */}
      <div className="sr-only focus-within:not-sr-only" lang="vi">
        {SYLLABLE_SLOTS.map((slot) => (
          <label key={slot}>
            {SLOT_NAME[slot]}
            <select
              value={state.selection[slot]}
              disabled={!interactive}
              onChange={(event) => cycle(slot, Number(event.target.value) - state.selection[slot])}
            >
              {lists[slot].map((value, index) => (
                <option key={value || 'none'} value={index}>
                  {labelOf(slot, value)}
                </option>
              ))}
            </select>
          </label>
        ))}
        {mode !== 'review' && (
          <button type="button" disabled={!canSubmit} onClick={() => void submit()}>
            Xong rồi!
          </button>
        )}
      </div>
      <p role="status" className="sr-only">
        {composed === '' ? '' : `Tiếng đang ghép: ${composed}. `}
        {message}
      </p>
    </>
  )
}

interface SlotButtonProps {
  y: number
  label: string
  disabled: boolean
  onPress: () => void
}

function SlotButton({ y, label, disabled, onPress }: SlotButtonProps) {
  const { colors } = useTheme()
  const press = disabled ? undefined : onPress
  return (
    <Group y={y} onClick={press} onTap={press}>
      <Rect
        width={SLOT_WIDTH}
        height={SLOT_BUTTON_HEIGHT}
        cornerRadius={20}
        fill={disabled ? colors.disabledSurface : colors.accent}
        stroke={disabled ? colors.disabledBorder : colors.accentBorder}
        strokeWidth={3}
      />
      <Text
        text={label}
        width={SLOT_WIDTH}
        height={SLOT_BUTTON_HEIGHT}
        align="center"
        verticalAlign="middle"
        fontSize={48}
        fontStyle="bold"
        fill={disabled ? colors.onDisabled : colors.onAccent}
        listening={false}
      />
    </Group>
  )
}
