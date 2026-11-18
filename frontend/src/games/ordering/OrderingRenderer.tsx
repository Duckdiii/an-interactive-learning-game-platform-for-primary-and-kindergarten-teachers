import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Group, Image as KonvaImage, Layer, Rect, Text } from 'react-konva'
import useImage from 'use-image'
import confetti from 'canvas-confetti'
import { viText } from '../../constants/viText'
import ConfirmButton from '../common/ConfirmButton'
import { measureWrappedTextHeight } from '../common/measureText'
import { STAGE_WIDTH } from '../common/mediaLayout'
import { wiggle } from '../common/motion'
import {
  ORDERING_SLOT_EMPTY_INK,
  ORDERING_SLOT_FILL,
  ORDERING_SLOT_INK,
  ORDERING_SLOT_STROKE,
  ORDERING_STEP_LOCKED_FILL,
  ORDERING_STEP_LOCKED_STROKE,
} from '../common/palette'
import QuestionAudioButton from '../common/QuestionAudioButton'
import QuestionIllustration from '../common/QuestionIllustration'
import ResponsiveStage from '../common/ResponsiveStage'
import { seededDerangement } from '../common/seededDerangement'
import { playSound } from '../common/sound'
import { useFeedback } from '../common/useFeedback'
import { useGamePalette } from '../common/useGamePalette'
import { useIllustration } from '../common/useIllustration'
import { useQuestionAudio } from '../common/useQuestionAudio'
import {
  computeOrderingLayout,
  findNearestSlot,
} from './orderingLayout'
import {
  canSubmitOrdering,
  createOrderingState,
  getOrderedStepIds,
  orderingReducer,
} from './orderingReducer'
import type {
  OrderingAnswerResult,
  OrderingDisplayStep,
  OrderingRendererProps,
  Point,
} from './orderingTypes'

function StepIllustration({
  url,
  x,
  y,
  size,
}: {
  url: string
  x: number
  y: number
  size: number
}) {
  const [img] = useImage(url)
  if (!img) return null
  return (
    <KonvaImage
      image={img}
      x={x}
      y={y}
      width={size}
      height={size}
      cornerRadius={12}
      listening={false}
    />
  )
}

export default function OrderingRenderer(props: OrderingRendererProps) {
  const { question, mode, disabled } = props
  const palette = useGamePalette()
  const { showFeedback } = useFeedback()
  const promptText =
    question.audioText ?? viText.present.play.hintByType.ORDERING ?? 'Bé hãy sắp xếp theo thứ tự đúng nhé!'

  const promptHeight = useMemo(() => {
    return (
      measureWrappedTextHeight({
        text: promptText,
        fontSize: 24,
        width: STAGE_WIDTH - 40,
        fontStyle: 'bold',
      }) ?? 36
    )
  }, [promptText])

  // Chuẩn hoá danh sách các bước
  const rawSteps = useMemo<OrderingDisplayStep[]>(() => {
    return question.steps.map((step) => ({
      id: step.id,
      text: step.text,
      visualPrompt: step.visualPrompt,
      imageUrl: step.imageUrl || undefined || undefined,
      correctPosition: 'correctPosition' in step ? (step.correctPosition as number) : undefined,
    }))
  }, [question.steps])

  const stepById = useMemo(() => {
    const map = new Map<string, OrderingDisplayStep>()
    rawSteps.forEach((s) => map.set(s.id, s))
    return map
  }, [rawSteps])

  // Khay ban đầu luôn được XÁO TRỘN, không hiển thị đúng thứ tự gốc
  const shuffledSteps = useMemo(() => {
    return seededDerangement(rawSteps, question.id || 'default-ordering-seed')
  }, [rawSteps, question.id])

  const [scale, setScale] = useState(1)

  const layout = useMemo(
    () =>
      computeOrderingLayout({
        steps: shuffledSteps,
        hasAudio: Boolean(question.audioUrl),
        hasIllustration: Boolean(question.imageUrl),
        promptHeight,
        minTouchPx: props.minTouchPx,
        scale,
      }),
    [shuffledSteps, question.audioUrl, question.imageUrl, promptHeight, props.minTouchPx, scale],
  )

  const initialAssignments = useMemo(() => {
    if (mode === 'review' && 'order' in props && props.order) {
      const map: Record<number, string> = {}
      props.order.forEach((stepId, index) => {
        map[index + 1] = stepId
      })
      return map
    }
    return {}
  }, [mode, props])

  const [state, dispatch] = useReducer(
    orderingReducer,
    undefined,
    () => createOrderingState(initialAssignments, mode === 'review'),
  )

  // Reset khi đổi câu hỏi
  const questionKey = [question.id, ...rawSteps.map((s) => s.id)].join('|')
  const lastQuestionKey = useRef(questionKey)
  useEffect(() => {
    if (lastQuestionKey.current !== questionKey) {
      lastQuestionKey.current = questionKey
      dispatch({ type: 'RESET' })
    }
  }, [questionKey])

  // Lắng nghe ở mode review
  useEffect(() => {
    if (mode === 'review' && 'order' in props && props.order) {
      const map: Record<number, string> = {}
      props.order.forEach((stepId, index) => {
        map[index + 1] = stepId
      })
      dispatch({ type: 'SYNC_REVIEW', slotAssignments: map })
    }
  }, [mode, props])

  // Audio prompt & Illustration
  const { image: illustrationImage } = useIllustration(question.imageUrl)
  const playQuestionAudio = useQuestionAudio(question.audioUrl)

  // Xử lý kéo - thả (Drag End)
  const handleDragEnd = useCallback(
    (stepId: string, dropPosition: Point) => {
      if (state.locked || disabled) return
      const step = stepById.get(stepId)
      if (!step) return

      const dropCenter: Point = {
        x: dropPosition.x + layout.itemWidth / 2,
        y: dropPosition.y + layout.itemHeight / 2,
      }

      const targetSlot = findNearestSlot(dropCenter, layout.slots)

      // Không trúng ô nào, hoặc ô đó đã có bước khác chiếm rồi -> bật về khay
      if (!targetSlot || state.slotAssignments[targetSlot.slotNumber]) {
        dispatch({ type: 'RESET_TO_TRAY', stepId })
        return
      }

      // Kiểm tra đúng / sai
      const expectedPos = step.correctPosition
      const isCorrect = expectedPos !== undefined ? expectedPos === targetSlot.slotNumber : true

      if (isCorrect) {
        dispatch({
          type: 'LOCK_STEP_INTO_SLOT',
          stepId,
          slotNumber: targetSlot.slotNumber,
        })
        playSound('/sounds/correct-drop.mp3')
      } else {
        dispatch({ type: 'RESET_TO_TRAY', stepId })
        dispatch({ type: 'TRIGGER_SHAKE', stepId, timestamp: Date.now() })
        playSound('/sounds/try-again.mp3')

        setTimeout(() => {
          dispatch({ type: 'CLEAR_SHAKE' })
        }, 600)
      }
    },
    [state.locked, state.slotAssignments, layout.slots, layout.itemWidth, layout.itemHeight, disabled, stepById],
  )

  // Hỗ trợ chạm (Tap) cho thiết bị cảm ứng
  const handleItemTap = useCallback(
    (stepId: string) => {
      if (state.locked || disabled) return
      const currentSlot = state.stepSlots[stepId]

      if (currentSlot) {
        // Đang trong slot mà chạm vào -> rút về khay
        dispatch({ type: 'RESET_TO_TRAY', stepId })
        return
      }

      // Đang ở khay: tìm slot trống đầu tiên để thả vào
      for (const slot of layout.slots) {
        if (!state.slotAssignments[slot.slotNumber]) {
          handleDragEnd(stepId, { x: slot.bounds.x, y: slot.bounds.y })
          break
        }
      }
    },
    [state.locked, state.stepSlots, state.slotAssignments, layout.slots, handleDragEnd, disabled],
  )

  // Xử lý nộp bài
  const handleSubmit = useCallback(async () => {
    if (!canSubmitOrdering(state.slotAssignments, rawSteps.length) || state.locked || state.submitting || disabled) {
      return
    }

    const orderedStepIds = getOrderedStepIds(state.slotAssignments, rawSteps.length)

    try {
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } })
    } catch {
      // Fallback
    }

    if (mode === 'preview') {
      const isCorrect = rawSteps.every((s) => s.correctPosition === state.stepSlots[s.id])
      const result: OrderingAnswerResult = {
        isCorrect,
        correctOrder: rawSteps
          .slice()
          .sort((a, b) => (a.correctPosition ?? 0) - (b.correctPosition ?? 0))
          .map((s) => s.id),
      }
      dispatch({ type: 'SUBMIT_SUCCESS', result })
      showFeedback(isCorrect)
      props.onAnswered?.({ order: orderedStepIds, orderedStepIds })
    } else if (mode === 'play') {
      dispatch({ type: 'START_SUBMIT' })
      try {
        const res = await props.onAnswered({ order: orderedStepIds, orderedStepIds })
        dispatch({ type: 'SUBMIT_SUCCESS', result: res })
        showFeedback(res.isCorrect)
      } catch {
        dispatch({ type: 'SUBMIT_ERROR' })
      }
    }
  }, [state.slotAssignments, state.locked, state.submitting, state.stepSlots, rawSteps, mode, props, showFeedback, disabled])

  // Lắc nhẹ khi thả sai
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!state.shakingStepId) return
    const interval = setInterval(() => setNow(Date.now()), 16)
    return () => clearInterval(interval)
  }, [state.shakingStepId])

  return (
    <ResponsiveStage
      width={layout.width}
      height={layout.height}
      onScaleChange={setScale}
    >
      <Layer>
        {/* Câu hỏi / Tiêu đề */}
        <Text
          text={promptText}
          x={20}
          y={layout.promptY}
          width={STAGE_WIDTH - 40}
          fontSize={24}
          fontStyle="bold"
          fill={palette.ink}
          align="center"
          listening={false}
        />

        {/* Nút nghe lại câu hỏi nếu có audioUrl */}
        {question.audioUrl && layout.audioY !== null && (
          <QuestionAudioButton
            y={layout.audioY}
            onPress={playQuestionAudio}
          />
        )}

        {/* Ảnh minh họa nếu có */}
        {question.imageUrl && layout.illustrationY !== null && illustrationImage && (
          <QuestionIllustration
            image={illustrationImage}
            y={layout.illustrationY}
          />
        )}

        {/* Dãy ô vị trí (Slot 1, 2, 3...) đánh số cố định */}
        {layout.slots.map((slot) => {
          const { slotNumber, bounds } = slot
          const occupiedStepId = state.slotAssignments[slotNumber]

          return (
            <Group key={`slot-${slotNumber}`} x={bounds.x} y={bounds.y}>
              {/* Ô số nét đứt bo góc 16px */}
              <Rect
                width={bounds.width}
                height={bounds.height}
                cornerRadius={16}
                fill={ORDERING_SLOT_FILL}
                stroke={ORDERING_SLOT_STROKE}
                strokeWidth={3}
                dash={[10, 5]}
                listening={false}
              />
              {/* Nhãn số thứ tự trên đầu ô */}
              <Text
                text={String(slotNumber)}
                fontSize={28}
                fontStyle="bold"
                y={-30}
                width={bounds.width}
                align="center"
                fill={ORDERING_SLOT_INK}
                listening={false}
              />
              {/* Placeholder khi ô chưa có thẻ */}
              {!occupiedStepId && (
                <Text
                  text={`Bước ${slotNumber}`}
                  fontSize={14}
                  fill={ORDERING_SLOT_EMPTY_INK}
                  x={0}
                  y={bounds.height / 2 - 8}
                  width={bounds.width}
                  align="center"
                  listening={false}
                />
              )}
            </Group>
          )
        })}

        {/* Khay chứa các bước ban đầu */}
        <Group x={layout.trayBounds.x} y={layout.trayBounds.y}>
          <Rect
            width={layout.trayBounds.width}
            height={layout.trayBounds.height}
            cornerRadius={16}
            fill={palette.surface}
            stroke={palette.disabledStroke}
            strokeWidth={2}
            dash={[6, 4]}
            listening={false}
          />
          <Text
            text="Khay các bước cần sắp xếp"
            fontSize={14}
            fill={palette.inkSoft}
            x={16}
            y={6}
            listening={false}
          />
        </Group>

        {/* Render các bước (Draggable Steps) */}
        {shuffledSteps.map((step) => {
          const slotNum = state.stepSlots[step.id]
          const isLockedInSlot = Boolean(slotNum)
          const isShaking = state.shakingStepId === step.id

          let itemPos: Point
          if (isLockedInSlot) {
            itemPos = layout.slotPositions[slotNum!]
          } else {
            itemPos = layout.trayPositions[step.id] ?? { x: 0, y: 0 }
          }

          let shakeOffset = 0
          if (isShaking) {
            const elapsed = (now - state.shakeTimestamp) / 1000
            shakeOffset = wiggle(elapsed, 0.6, 12)
          }

          const hasImage = Boolean(step.imageUrl)
          const imgSize = hasImage ? Math.min(layout.itemWidth - 24, 60) : 0

          return (
            <Group
              key={step.id}
              x={itemPos.x + shakeOffset}
              y={itemPos.y}
              draggable={!state.locked && !disabled && !isLockedInSlot}
              onClick={() => handleItemTap(step.id)}
              onTap={() => handleItemTap(step.id)}
              onDragStart={(e) => {
                e.target.moveToTop()
              }}
              onDragEnd={(e) => {
                handleDragEnd(step.id, { x: e.target.x(), y: e.target.y() })
                // Reset node position để Konva vẽ theo vị trí quản lý bởi state
                e.target.position({ x: itemPos.x, y: itemPos.y })
              }}
            >
              {/* Thẻ bước bo tròn */}
              <Rect
                width={layout.itemWidth}
                height={layout.itemHeight}
                cornerRadius={16}
                fill={isLockedInSlot ? ORDERING_STEP_LOCKED_FILL : palette.surface}
                stroke={isLockedInSlot ? ORDERING_STEP_LOCKED_STROKE : palette.outline}
                strokeWidth={isLockedInSlot ? 3 : 2}
                shadowColor={palette.ink}
                shadowBlur={isLockedInSlot ? 2 : 4}
                shadowOpacity={0.15}
                shadowOffset={{ x: 0, y: 2 }}
              />

              {/* Hình ảnh của bước nếu có */}
              {step.imageUrl && (
                <StepIllustration
                  url={step.imageUrl}
                  x={(layout.itemWidth - imgSize) / 2}
                  y={12}
                  size={imgSize}
                />
              )}

              {/* Nội dung chữ của bước */}
              {step.text && (
                <Text
                  text={step.text}
                  fontSize={15}
                  fontStyle="bold"
                  fill={palette.ink}
                  x={8}
                  y={hasImage ? imgSize + 18 : (layout.itemHeight - 32) / 2}
                  width={layout.itemWidth - 16}
                  align="center"
                  listening={false}
                />
              )}
            </Group>
          )
        })}

        {/* Nút «Xong rồi!» */}
        {mode !== 'review' && (
          <ConfirmButton
            y={layout.confirmY}
            height={layout.confirmHeight}
            width={layout.confirmWidth}
            enabled={canSubmitOrdering(state.slotAssignments, rawSteps.length) && !state.submitting && !disabled}
            onPress={handleSubmit}
          />
        )}
      </Layer>
    </ResponsiveStage>
  )
}
