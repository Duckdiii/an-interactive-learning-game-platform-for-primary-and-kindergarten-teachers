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
import { usePrefersReducedMotion } from '../../feedback/usePrefersReducedMotion'
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
  itemHitStroke,
  SCENE_X,
} from './prepositionLayout'
import { DROP_FRAME_MS, type DropSimulator } from './dropTypes'
import { createPrepositionState, itemSize, prepositionReducer, startCenter } from './prepositionLogic'
import type { PlacementAnswerResult, PrepositionSceneQuestion, PrepositionSceneStudentQuestion } from './prepositionTypes'

/**
 * Prop phụ thuộc `mode` (union) như các renderer khác của dự án:
 * - `dropSimulator` (preview/play, tuỳ chọn): thả rơi theo vật lý; đúng/sai vẫn chấm trên TOẠ ĐỘ CUỐI bằng hàm thuần.
 * - preview: giáo viên xem thử; `question` có quy tắc, renderer tự chấm cục bộ (`satisfies`).
 * - play: học sinh chơi; `question` KHÔNG có quy tắc; cha chấm (Backend) và PHẢI trả kết quả (kèm `correctCenter` nếu
 *   muốn chỉ chỗ đúng khi trẻ sai). Renderer không tự chấm ở mode này.
 * - review: xem lại, khóa sẵn; `selectedCenter` bỏ trống khi hết giờ/bỏ qua.
 */
export type PrepositionSceneRendererProps =
  | { mode: 'preview'; question: PrepositionSceneQuestion; onAnswered?: (center: Point) => void; dropSimulator?: DropSimulator }
  | {
      mode: 'play'
      question: PrepositionSceneStudentQuestion
      onAnswered: (center: Point) => PlacementAnswerResult | Promise<PlacementAnswerResult>
      /** Có thì buông tay là vật RƠI rồi nằm yên; vị trí nộp là vị trí nằm yên. Không có thì vật ở nguyên chỗ buông. */
      dropSimulator?: DropSimulator
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
  const done = state.phase === 'done'

  // ---- kéo và thả rơi ----
  const [dragCenter, setDragCenter] = useState<Point | null>(null)
  const prefersReduced = usePrefersReducedMotion()
  const dropSimulator = props.mode === 'review' ? undefined : props.dropSimulator
  // Đang chạy hoạt ảnh rơi: danh sách khung và khung hiện tại. Trong lúc rơi không nhận thao tác.
  const [drop, setDrop] = useState<{ frames: Point[]; index: number } | null>(null)
  const dropping = drop !== null
  // Khóa đồng bộ: hai lần chạm đến trước khi React vẽ lại chỉ chạy mô phỏng một lần.
  const dropLockRef = useRef(false)
  // Bàn phím đã dời vật nhưng chưa thả: chưa cho nộp (vị trí lơ lửng chưa phải chỗ nằm yên).
  const [pendingRelease, setPendingRelease] = useState(false)
  const sizeRef = useRef(size)
  useEffect(() => {
    sizeRef.current = size
  })
  const interactive = mode !== 'review' && state.phase === 'idle' && !dropping
  const center = drop ? drop.frames[Math.min(drop.index, drop.frames.length - 1)] : (dragCenter ?? state.center)

  useEffect(() => {
    if (!drop) return
    const frames = drop.frames
    const t0 = performance.now()
    let raf = 0
    const tick = () => {
      const index = Math.floor((performance.now() - t0) / DROP_FRAME_MS)
      if (index >= frames.length - 1) {
        // Hết hoạt ảnh: vị trí cuối trở thành vị trí đã đặt (nguồn duy nhất cho việc nộp và chấm).
        dropLockRef.current = false
        dispatch({ type: 'place', center: frames[frames.length - 1], size: sizeRef.current })
        setDrop(null)
        return
      }
      setDrop((current) => (current && current.index !== index ? { ...current, index } : current))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // Chỉ chạy lại khi bắt đầu một lần rơi mới (đổi danh sách khung); `size` đọc qua ref để cha dựng lại câu hỏi
    // (đối tượng mới, cùng nội dung) giữa lúc rơi không làm hoạt ảnh bắt đầu lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drop?.frames])

  // ---- bố cục ----
  const instructionHeight = useMemo(
    () =>
      measureWrappedTextHeight({ text: question.instruction, fontSize: INSTRUCTION_FONT_SIZE, width: INSTRUCTION_WIDTH }) ??
      estimateHeight(question.instruction, INSTRUCTION_FONT_SIZE, INSTRUCTION_WIDTH),
    [question.instruction],
  )
  const layout = computePrepositionLayout({ hasAudio: Boolean(question.audioUrl), instructionHeight, showConfirm: mode !== 'review' })

  // Đặt vật (kéo, chạm, nút bàn phím): có bộ mô phỏng thì buông tay là vật rơi; giảm chuyển động thì nhảy thẳng tới chỗ nằm yên.
  const release = (from: Point) => {
    if (!dropSimulator || dropLockRef.current) return
    setPendingRelease(false)
    const result = dropSimulator({ landmark: question.landmark, size, start: clampCenter(from, size) })
    if (prefersReduced || result.frames.length < 2) return dispatch({ type: 'place', center: result.final, size })
    dropLockRef.current = true
    setDrop({ frames: result.frames, index: 0 })
  }
  // Kéo/chạm: buông là rơi. Bàn phím: nút nhích chỉ dời vật (không rơi từng lần, nếu không không bao giờ lên được mặt bàn);
  // nút «Let go» mới thả.
  const place = (next: Point) => (dropSimulator ? release(next) : dispatch({ type: 'place', center: next, size }))
  const nudge = (next: Point) => {
    dispatch({ type: 'place', center: next, size })
    if (dropSimulator) setPendingRelease(true)
  }

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
  const canSubmit = interactive && !pendingRelease

  const announcement = dropping
    ? `The ${question.item.label} is falling.`
    : pendingRelease
      ? `The ${question.item.label} is held in the air. Press Let go to drop it.`
      : result
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
                <Rect width={size.width} height={size.height} cornerRadius={24} fill={itemFill} stroke={itemStroke} strokeWidth={6} hitStrokeWidth={itemHitStroke(question.item)} />
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
          <button key={label} type="button" disabled={!interactive} onClick={() => nudge({ x: state.center.x + dx, y: state.center.y + dy })}>
            {label}
          </button>
        ))}
        {dropSimulator && mode !== 'review' && (
          <button type="button" disabled={!interactive || !pendingRelease} onClick={() => release(state.center)}>
            Let go
          </button>
        )}
        {mode !== 'review' && (
          <button type="button" disabled={!canSubmit} onClick={() => void submit()}>
            Done!
          </button>
        )}
      </div>
      <p role="status" className="sr-only" lang="en">
        {noAnswer || dropping ? '' : `${describePlacement(question.landmark, question.item.label, size, state.center)} `}
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
