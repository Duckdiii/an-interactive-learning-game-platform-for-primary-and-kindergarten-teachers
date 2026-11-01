import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { Group, Image as KonvaImage, Layer, Rect, Text } from 'react-konva'
import useImage from 'use-image'
import ConfirmButton from '../common/ConfirmButton'
import { measureWrappedTextHeight } from '../common/measureText'
import { STAGE_WIDTH } from '../common/mediaLayout'
import QuestionAudioButton from '../common/QuestionAudioButton'
import QuestionIllustration from '../common/QuestionIllustration'
import ResponsiveStage from '../common/ResponsiveStage'
import { playSound } from '../common/sound'
import { useFeedback } from '../common/useFeedback'
import { useGamePalette } from '../common/useGamePalette'
import { useIllustration } from '../common/useIllustration'
import { useQuestionAudio } from '../common/useQuestionAudio'
import {
  computeDragDropLayout,
  isInsideZone,
  ITEM_SIZE,
} from './dragDropLayout'
import { canSubmit, createDragDropState, dragDropReducer } from './dragDropReducer'
import type { DragDropAnswerResult, DragDropDisplayItem, DragDropRendererProps, Point } from './dragDropTypes'

function ItemIllustration({ url, x, y, size }: { url: string; x: number; y: number; size: number }) {
  const [img] = useImage(url)
  if (!img) return null
  return <KonvaImage image={img} x={x} y={y} width={size} height={size} cornerRadius={10} listening={false} />
}

export default function DragDropRenderer(props: DragDropRendererProps) {
  const { question, mode, disabled } = props
  const palette = useGamePalette()
  const { showFeedback } = useFeedback()
  const promptText = question.audioText ?? 'Kéo thả các vật thể vào đúng rổ phân loại'

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

  const items = useMemo<DragDropDisplayItem[]>(() => {
    return question.items.map((item) => ({
      id: item.id,
      text: item.text,
      visualPrompt: item.visualPrompt,
      imageUrl: item.imageUrl,
      targetZoneId: 'targetZoneId' in item ? (item.targetZoneId as string) : undefined,
    }))
  }, [question.items])

  const layout = useMemo(
    () =>
      computeDragDropLayout({
        items,
        dropZones: question.dropZones,
        hasAudio: Boolean(question.audioUrl),
        hasIllustration: Boolean(question.imageUrl),
        promptHeight,
      }),
    [items, question.dropZones, question.audioUrl, question.imageUrl, promptHeight],
  )

  const initialPlacements = useMemo(() => {
    if (mode === 'review' && 'placements' in props && props.placements) {
      const map: Record<string, string> = {}
      props.placements.forEach((p) => {
        map[p.itemId] = p.zoneId
      })
      return map
    }
    return {}
  }, [mode, props])

  const [state, dispatch] = useReducer(
    dragDropReducer,
    undefined,
    () => createDragDropState(initialPlacements, mode === 'review'),
  )

  // Reset state when question changes
  const lastQuestionId = useRef(question.id)
  useEffect(() => {
    if (lastQuestionId.current !== question.id) {
      lastQuestionId.current = question.id
      dispatch({ type: 'RESET' })
    }
  }, [question.id])

  const playAudio = useQuestionAudio(question.audioUrl)
  const illustration = useIllustration(question.imageUrl)

  const handleDragEnd = useCallback(
    (itemId: string, pos: Point) => {
      if (state.locked || disabled) return
      const center: Point = { x: pos.x + ITEM_SIZE / 2, y: pos.y + ITEM_SIZE / 2 }
      const targetZone = layout.zones.find((z) => isInsideZone(center, z.bounds))

      if (targetZone) {
        playSound('/sounds/click.wav')
        dispatch({ type: 'PLACE_ITEM', itemId, zoneId: targetZone.id })
      } else {
        // Rơi ra ngoài: nếu đang ở trong zone thì trả về khay
        if (state.placements[itemId]) {
          dispatch({ type: 'UNPLACE_ITEM', itemId })
        }
      }
    },
    [layout.zones, state.locked, state.placements, disabled],
  )

  const handleItemTap = useCallback(
    (itemId: string) => {
      if (state.locked || disabled) return

      // Nếu item đang ở trong rổ -> bấm để trả về khay
      if (state.placements[itemId]) {
        dispatch({ type: 'UNPLACE_ITEM', itemId })
        return
      }

      // Nếu item ở khay -> chọn/bỏ chọn
      dispatch({ type: 'SELECT_ITEM', itemId })
    },
    [state.locked, state.placements, disabled],
  )

  const handleZoneTap = useCallback(
    (zoneId: string) => {
      if (state.locked || disabled) return
      if (state.selectedItemId) {
        playSound('/sounds/click.wav')
        dispatch({ type: 'PLACE_ITEM', itemId: state.selectedItemId, zoneId })
      }
    },
    [state.locked, state.selectedItemId, disabled],
  )

  const handleSubmit = useCallback(async () => {
    if (!canSubmit(state.placements, items.length) || state.locked || state.submitting || disabled) {
      return
    }

    const placementList = Object.entries(state.placements).map(([itemId, zoneId]) => ({
      itemId,
      zoneId,
    }))

    if (mode === 'preview') {
      const isCorrect = items.every((item) => state.placements[item.id] === item.targetZoneId)
      const correctPlacements = items
        .filter((item) => item.targetZoneId)
        .map((item) => ({ itemId: item.id, zoneId: item.targetZoneId! }))

      const result: DragDropAnswerResult = { isCorrect, correctPlacements }
      dispatch({ type: 'SUBMIT_SUCCESS', result })
      showFeedback(isCorrect)
      props.onAnswered?.(placementList)
    } else if (mode === 'play') {
      dispatch({ type: 'START_SUBMIT' })
      try {
        const result = await props.onAnswered(placementList)
        dispatch({ type: 'SUBMIT_SUCCESS', result })
        showFeedback(result.isCorrect)
      } catch {
        dispatch({ type: 'SUBMIT_ERROR' })
      }
    }
  }, [state.placements, state.locked, state.submitting, items, mode, props, showFeedback, disabled])

  // Gom các item theo từng zone để tính vị trí hiển thị trong zone
  const itemsByZone = useMemo(() => {
    const map: Record<string, DragDropDisplayItem[]> = {}
    question.dropZones.forEach((z) => {
      map[z.id] = []
    })
    items.forEach((item) => {
      const zoneId = state.placements[item.id]
      if (zoneId && map[zoneId]) {
        map[zoneId].push(item)
      }
    })
    return map
  }, [items, question.dropZones, state.placements])

  return (
    <ResponsiveStage width={layout.width} height={layout.height}>
      <Layer>
        {/* Nền toàn màn */}
        <Rect width={layout.width} height={layout.height} fill={palette.page} listening={false} />

        {/* Tiêu đề / Lời nhắc */}
        <Text
          text={promptText}
          fontSize={24}
          fontStyle="bold"
          fill={palette.ink}
          x={20}
          y={layout.promptY}
          width={layout.width - 40}
          align="center"
          listening={false}
        />

        {/* Nút nghe lại */}
        {layout.audioY !== null && <QuestionAudioButton y={layout.audioY} onPress={playAudio} />}

        {/* Ảnh minh hoạ câu hỏi nếu có */}
        {layout.illustrationY !== null && (
          <QuestionIllustration image={illustration.image} y={layout.illustrationY} />
        )}

        {/* Các DropZones (rổ phân loại) */}
        {layout.zones.map((zone) => {
          const zoneColor = palette.linkColors[zone.colorIndex % palette.linkColors.length]
          const isTargeted = Boolean(state.selectedItemId)

          return (
            <Group
              key={zone.id}
              x={zone.bounds.x}
              y={zone.bounds.y}
              onClick={() => handleZoneTap(zone.id)}
              onTap={() => handleZoneTap(zone.id)}
            >
              {/* Thân rổ */}
              <Rect
                width={zone.bounds.width}
                height={zone.bounds.height}
                cornerRadius={18}
                fill={palette.surface}
                stroke={isTargeted ? palette.accent : zoneColor}
                strokeWidth={isTargeted ? 4 : 3}
                dash={isTargeted ? [8, 4] : undefined}
              />

              {/* Thanh nhãn phía trên rổ */}
              <Rect
                width={zone.bounds.width}
                height={40}
                cornerRadius={[18, 18, 0, 0]}
                fill={zoneColor}
                listening={false}
              />
              <Text
                text={zone.label}
                fontSize={20}
                fontStyle="bold"
                fill={palette.surface}
                width={zone.bounds.width}
                height={40}
                align="center"
                verticalAlign="middle"
                listening={false}
              />
            </Group>
          )
        })}

        {/* Khay chứa vật thể chưa phân loại */}
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
            text="Khay đồ vật (Chạm hoặc kéo vào rổ)"
            fontSize={14}
            fill={palette.inkSoft}
            x={16}
            y={6}
            listening={false}
          />
        </Group>

        {/* Render các vật thể (Draggable items) */}
        {items.map((item) => {
          const zoneId = state.placements[item.id]
          const isPlaced = Boolean(zoneId)
          const isSelected = state.selectedItemId === item.id

          let itemPos: Point
          if (isPlaced) {
            const indexInZone = itemsByZone[zoneId]?.findIndex((i) => i.id === item.id) ?? 0
            itemPos = layout.zoneItemPositions[zoneId]?.[indexInZone] ?? { x: 0, y: 0 }
          } else {
            itemPos = layout.trayPositions[item.id] ?? { x: 0, y: 0 }
          }

          // Kiểm tra xem vị trí đặt đúng hay sai ở review / sau khi nộp
          const isWrongPlacement =
            (state.locked || mode === 'review') &&
            Boolean(state.result && !state.result.isCorrect && isPlaced)

          return (
            <Group
              key={item.id}
              x={itemPos.x}
              y={itemPos.y}
              draggable={!state.locked && !disabled}
              onClick={() => handleItemTap(item.id)}
              onTap={() => handleItemTap(item.id)}
              onDragStart={(e) => {
                e.target.moveToTop()
              }}
              onDragEnd={(e) => {
                handleDragEnd(item.id, { x: e.target.x(), y: e.target.y() })
                // Đặt lại toạ độ node để Konva vẽ lại ở vị trí quy định của Reducer
                e.target.position({ x: itemPos.x, y: itemPos.y })
              }}
            >
              <Rect
                width={ITEM_SIZE}
                height={ITEM_SIZE}
                cornerRadius={14}
                fill={palette.surface}
                stroke={
                  isSelected
                    ? palette.accent
                    : isWrongPlacement
                      ? palette.wrongLine
                      : palette.outline
                }
                strokeWidth={isSelected ? 4 : 2}
                shadowColor={palette.ink}
                shadowBlur={isSelected ? 8 : 4}
                shadowOpacity={isSelected ? 0.25 : 0.1}
                shadowOffset={{ x: 0, y: 2 }}
              />

              {item.imageUrl ? (
                <ItemIllustration url={item.imageUrl} x={6} y={6} size={ITEM_SIZE - 12} />
              ) : (
                <Text
                  text={item.text ?? item.visualPrompt ?? ''}
                  fontSize={16}
                  fontStyle="bold"
                  fill={palette.ink}
                  width={ITEM_SIZE - 8}
                  height={ITEM_SIZE}
                  x={4}
                  align="center"
                  verticalAlign="middle"
                  wrap="word"
                  listening={false}
                />
              )}
            </Group>
          )
        })}

        {/* Nút «Xong rồi!» */}
        {!state.locked && mode !== 'review' && (
          <ConfirmButton
            y={layout.confirmY}
            enabled={canSubmit(state.placements, items.length) && !state.submitting && !disabled}
            onPress={handleSubmit}
          />
        )}

        {/* Phản hồi sau khi chấm (ở mode play/preview khi sai, hoặc ở review) */}
        {state.result && (
          <Text
            text={
              state.result.isCorrect
                ? 'Tuyệt vời! Bé đã phân loại đúng hết!'
                : 'Bé quan sát kỹ các rổ và thử ôn lại nhé!'
            }
            fontSize={20}
            fontStyle="bold"
            fill={state.result.isCorrect ? palette.primary : palette.accent}
            x={20}
            y={layout.confirmY + 16}
            width={layout.width - 40}
            align="center"
            listening={false}
          />
        )}
      </Layer>
    </ResponsiveStage>
  )
}
