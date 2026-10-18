import type { KonvaEventObject } from 'konva/lib/Node'
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
  clampCenter,
  describePlacement,
  GROUND_Y,
  idealCenter,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  satisfies,
  TABLE_SLAB,
  type Landmark,
  type Point,
} from './prepositionGeometry'
import {
  CONFIRM_BUTTON_HEIGHT,
  CONFIRM_BUTTON_WIDTH,
  computePrepositionLayout,
  INSTRUCTION_FONT_SIZE,
  INSTRUCTION_WIDTH,
  SCENE_X,
} from './prepositionLayout'
import { createPrepositionState, itemSize, prepositionReducer, startCenter } from './prepositionLogic'
import type { PlacementAnswerResult, PrepositionSceneQuestion, PrepositionSceneStudentQuestion } from './prepositionTypes'

/**
 * Prop phụ thuộc `mode` (union) như các renderer khác của dự án:
 * - preview: giáo viên xem thử; `question` có quy tắc, renderer tự chấm cục bộ (`satisfies`).
 * - play: học sinh chơi; `question` KHÔNG có quy tắc; cha chấm (Backend) và PHẢI trả kết quả (kèm `correctCenter` nếu
 *   muốn chỉ chỗ đúng khi trẻ sai). Renderer không tự chấm ở mode này.
 * - review: xem lại, khóa sẵn; `selectedCenter` bỏ trống khi hết giờ/bỏ qua.
 */
export type PrepositionSceneRendererProps =
  | { mode: 'preview'; question: PrepositionSceneQuestion; onAnswered?: (center: Point) => void }
  | {
      mode: 'play'
      question: PrepositionSceneStudentQuestion
      onAnswered: (center: Point) => PlacementAnswerResult | Promise<PlacementAnswerResult>
    }
  | { mode: 'review'; question: PrepositionSceneQuestion; selectedCenter?: Point }

/** Bước nhích của nút bàn phím (đơn vị cảnh). */
export const NUDGE_STEP = 20

/** Ước lượng chiều cao chữ khi không đo được (môi trường không có Canvas): thiên về dư. */
function estimateHeight(text: string, fontSize: number, width: number): number {
  const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.6)))
  return Math.max(1, Math.ceil([...text].length / charsPerLine)) * fontSize * 1.25
}

export default function PrepositionSceneRenderer(props: PrepositionSceneRendererProps) {
  const q = props.question
  // Sửa nội dung câu (vật mốc, vật, quy tắc) mà giữ id vẫn phải đặt lại, nếu không vị trí cũ nằm sai chỗ trong cảnh mới.
  const content = JSON.stringify([q.landmark, q.item, props.mode === 'play' ? '' : props.question.preposition])
  const selected = props.mode === 'review' && props.selectedCenter ? JSON.stringify(props.selectedCenter) : ''
  return <SceneBoard key={`${props.mode}-${q.id}-${content}-${selected}`} {...props} />
}

function SceneBoard(props: PrepositionSceneRendererProps) {
  const { question, mode } = props
  const { colors } = useTheme()
  const feedback = useExperimentFeedback()
  const playAudio = useQuestionAudio(question.audioUrl)
  const size = useMemo(() => itemSize(question), [question])

  const [state, dispatch] = useReducer(prepositionReducer, undefined, () =>
    props.mode === 'review' && props.selectedCenter
      ? createPrepositionState(clampCenter(props.selectedCenter, itemSize(props.question)), 'done')
      : createPrepositionState(startCenter(question), mode === 'review' ? 'done' : 'idle'),
  )
  const noAnswer = props.mode === 'review' && !props.selectedCenter

  // Kết quả chấm. Xem lại: suy ra từ câu hỏi (có quy tắc) và vị trí đã đặt.
  const [submitted, setSubmitted] = useState<PlacementAnswerResult | null>(null)
  const [sendFailed, setSendFailed] = useState(false)
  const reviewResult: PlacementAnswerResult | null =
    props.mode === 'review' && !noAnswer
      ? {
          isCorrect: satisfies(props.question.preposition, props.question.landmark, size, state.center),
          correctCenter: idealCenter(props.question.preposition, props.question.landmark, size) ?? undefined,
        }
      : null
  const result = mode === 'review' ? reviewResult : submitted
  // Chỉ chỉ chỗ đúng khi trẻ SAI hoặc không trả lời; đặt đúng rồi thì không hiện khung (tránh tưởng «gần đúng»).
  // `correctCenter` do cha gửi nên được làm sạch: không hữu hạn thì bỏ, ngoài cảnh thì kẹp vào cảnh.
  const rawReveal = result ? (result.isCorrect ? undefined : result.correctCenter) : noAnswer && props.mode === 'review' ? (idealCenter(props.question.preposition, props.question.landmark, size) ?? undefined) : undefined
  const revealCenter = rawReveal && Number.isFinite(rawReveal.x) && Number.isFinite(rawReveal.y) ? clampCenter(rawReveal, size) : undefined

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

  // ---- kéo ----
  const [dragCenter, setDragCenter] = useState<Point | null>(null)
  const center = dragCenter ?? state.center

  // ---- bố cục ----
  const instructionHeight = useMemo(
    () =>
      measureWrappedTextHeight({ text: question.instruction, fontSize: INSTRUCTION_FONT_SIZE, width: INSTRUCTION_WIDTH }) ??
      estimateHeight(question.instruction, INSTRUCTION_FONT_SIZE, INSTRUCTION_WIDTH),
    [question.instruction],
  )
  const layout = computePrepositionLayout({ hasAudio: Boolean(question.audioUrl), instructionHeight, showConfirm: mode !== 'review' })

  const place = (next: Point) => dispatch({ type: 'place', center: next, size })

  const handleSceneTap = (event: KonvaEventObject<Event>) => {
    if (!interactive) return
    const position = event.target.getStage()?.getRelativePointerPosition()
    if (position) place({ x: position.x - SCENE_X, y: position.y - layout.sceneY })
  }

  const finish = (answer: PlacementAnswerResult) => {
    setSubmitted(answer)
    dispatch({ type: 'submitDone' })
    feedback.trigger(answer.isCorrect ? 'correct' : 'tryAgain')
  }

  const submit = async () => {
    if (props.mode === 'review' || !interactive || submitLockRef.current) return
    submitLockRef.current = true
    setSendFailed(false)
    const placed = state.center
    dispatch({ type: 'submitStart' })
    if (props.mode === 'preview') {
      finish({
        isCorrect: satisfies(props.question.preposition, props.question.landmark, size, placed),
        correctCenter: idealCenter(props.question.preposition, props.question.landmark, size) ?? undefined,
      })
      // Gọi trong Promise để lỗi ném đồng bộ lẫn bất đồng bộ của cha đều chỉ được ghi log, không làm hỏng màn.
      new Promise<void>((resolve) => resolve(void props.onAnswered?.(placed))).catch((error) => {
        console.error('PrepositionSceneRenderer: onAnswered (preview) bị lỗi', error)
      })
      return
    }
    let answer: PlacementAnswerResult
    try {
      answer = await props.onAnswered(placed)
    } catch (error) {
      if (!activeRef.current) return
      console.error('PrepositionSceneRenderer: onAnswered bị lỗi, mở khóa lại để thử lại', error)
      submitLockRef.current = false
      setSendFailed(true)
      dispatch({ type: 'submitFailed' })
      return
    }
    if (!activeRef.current) return
    // Cha trả sai dạng (không có isCorrect kiểu boolean) coi như chưa nhận được kết quả.
    if (typeof answer?.isCorrect !== 'boolean') {
      console.error('PrepositionSceneRenderer: onAnswered trả kết quả sai dạng', answer)
      submitLockRef.current = false
      setSendFailed(true)
      dispatch({ type: 'submitFailed' })
      return
    }
    finish(answer)
  }

  // ---- màu ----
  const itemFill = done && result ? (result.isCorrect ? colors.surfaceCorrect : colors.surfaceTryAgain) : colors.accent
  const itemStroke = done && result ? (result.isCorrect ? colors.lineCorrect : colors.lineTryAgain) : colors.accentBorder
  const itemTextFill = done && result ? colors.text : colors.onAccent
  const canSubmit = interactive

  const announcement = result
    ? result.isCorrect
      ? 'Great job!'
      : result.correctCenter !== undefined
        ? 'Good try! The dashed place is the right one.'
        : 'Not quite. Good try!'
    : noAnswer && revealCenter !== undefined
      ? 'No answer. The dashed place is the right one.'
      : sendFailed
        ? 'Could not send. Tap Done! again.'
        : ''

  return (
    <>
      <ResponsiveStage width={STAGE_WIDTH} height={layout.stageHeight}>
        <Layer>
          {layout.audioY !== null && <QuestionAudioButton y={layout.audioY} onPress={playAudio} />}

          <Text
            text={question.instruction}
            fontSize={INSTRUCTION_FONT_SIZE}
            fill={colors.onBackground}
            x={(STAGE_WIDTH - INSTRUCTION_WIDTH) / 2}
            y={layout.instructionY}
            width={INSTRUCTION_WIDTH}
            height={layout.instructionHeight}
            align="center"
            verticalAlign="middle"
            listening={false}
          />

          <Group x={SCENE_X} y={layout.sceneY} onClick={handleSceneTap} onTap={handleSceneTap}>
            <Rect width={SCENE_WIDTH} height={SCENE_HEIGHT} cornerRadius={20} fill={colors.surface} stroke={colors.border} strokeWidth={3} />
            <Rect y={GROUND_Y} width={SCENE_WIDTH} height={SCENE_HEIGHT - GROUND_Y} fill={colors.disabledSurface} listening={false} />
            <LandmarkShape landmark={question.landmark} />

            {revealCenter !== undefined && (
              <Rect
                x={revealCenter.x - size.width / 2}
                y={revealCenter.y - size.height / 2}
                width={size.width}
                height={size.height}
                cornerRadius={24}
                stroke={colors.lineCorrect}
                strokeWidth={6}
                dash={[10, 8]}
                listening={false}
              />
            )}

            {!noAnswer && (
              <Group
                name="item"
                x={center.x - size.width / 2}
                y={center.y - size.height / 2}
                draggable={interactive}
                onClick={(event: KonvaEventObject<Event>) => {
                  event.cancelBubble = true
                }}
                onTap={(event: KonvaEventObject<Event>) => {
                  event.cancelBubble = true
                }}
                onDragMove={(event: KonvaEventObject<DragEvent>) => {
                  const node = event.target
                  const next = clampCenter({ x: node.x() + size.width / 2, y: node.y() + size.height / 2 }, size)
                  node.position({ x: next.x - size.width / 2, y: next.y - size.height / 2 })
                  setDragCenter(next)
                }}
                onDragEnd={(event: KonvaEventObject<DragEvent>) => {
                  place({ x: event.target.x() + size.width / 2, y: event.target.y() + size.height / 2 })
                  setDragCenter(null)
                }}
              >
                <Rect width={size.width} height={size.height} cornerRadius={24} fill={itemFill} stroke={itemStroke} strokeWidth={6} />
                <Text
                  text={question.item.label}
                  width={size.width}
                  height={size.height}
                  align="center"
                  verticalAlign="middle"
                  fontSize={28}
                  fontStyle="bold"
                  fill={itemTextFill}
                  listening={false}
                />
              </Group>
            )}
          </Group>

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
                text={state.phase === 'submitting' ? 'Checking…' : sendFailed ? 'Try again!' : 'Done!'}
                width={CONFIRM_BUTTON_WIDTH}
                height={CONFIRM_BUTTON_HEIGHT}
                align="center"
                verticalAlign="middle"
                fontSize={36}
                fontStyle="bold"
                fill={canSubmit ? colors.onAccent : colors.onDisabled}
                listening={false}
              />
            </Group>
          )}

          <FeedbackOverlay plan={feedback.plan} runId={feedback.runId} x={SCENE_X} y={layout.sceneY} width={SCENE_WIDTH} height={SCENE_HEIGHT} />
        </Layer>
      </ResponsiveStage>

      {/* Lối thay thế cho bàn phím và trình đọc màn hình: canvas không có cây DOM. Chỉ hiện khi được tiêu điểm. */}
      <div className="sr-only focus-within:not-sr-only" lang="en">
        {(
          [
            ['Move left', -NUDGE_STEP, 0],
            ['Move right', NUDGE_STEP, 0],
            ['Move up', 0, -NUDGE_STEP],
            ['Move down', 0, NUDGE_STEP],
          ] as const
        ).map(([label, dx, dy]) => (
          <button key={label} type="button" disabled={!interactive} onClick={() => place({ x: state.center.x + dx, y: state.center.y + dy })}>
            {label}
          </button>
        ))}
        {mode !== 'review' && (
          <button type="button" disabled={!canSubmit} onClick={() => void submit()}>
            Done!
          </button>
        )}
      </div>
      <p role="status" className="sr-only" lang="en">
        {noAnswer ? '' : `${describePlacement(question.landmark, question.item.label, size, state.center)} `}
        {announcement}
      </p>
    </>
  )
}

function LandmarkShape({ landmark }: { landmark: Landmark }) {
  const { colors } = useTheme()
  const { x, y, width, height, kind, label } = landmark
  return (
    <Group listening={false}>
      {kind === 'TABLE' ? (
        <>
          <Rect x={x + 16} y={y + TABLE_SLAB} width={24} height={height - TABLE_SLAB} fill={colors.border} />
          <Rect x={x + width - 16 - 24} y={y + TABLE_SLAB} width={24} height={height - TABLE_SLAB} fill={colors.border} />
          <Rect x={x} y={y} width={width} height={TABLE_SLAB} cornerRadius={10} fill={colors.surfaceSelected} stroke={colors.border} strokeWidth={4} />
        </>
      ) : (
        <Rect x={x} y={y} width={width} height={height} cornerRadius={10} fill={colors.surfaceSelected} stroke={colors.border} strokeWidth={4} />
      )}
      <Text text={label} x={x} y={GROUND_Y + 6} width={width} align="center" fontSize={24} fill={colors.text} />
    </Group>
  )
}
