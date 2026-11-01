import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { Group, Layer, Line, Rect, Text } from 'react-konva'
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
  computeWordScrambleLayout,
  TILE_SIZE,
} from './wordScrambleLayout'
import { isWordMatch } from './wordScrambleLogic'
import {
  canSubmit,
  constructWord,
  createWordScrambleState,
  wordScrambleReducer,
} from './wordScrambleReducer'
import type {
  LetterTile,
  Point,
  WordScrambleAnswerResult,
  WordScrambleRendererProps,
} from './wordScrambleTypes'

export default function WordScrambleRenderer(props: WordScrambleRendererProps) {
  const { question, mode, disabled } = props
  const palette = useGamePalette()
  const { showFeedback } = useFeedback()
  const promptText = question.audioText ?? 'Ghép các chữ cái thành từ đúng'

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

  // Xây dựng danh sách LetterTile độc lập với id duy nhất để hỗ trợ các chữ cái trùng nhau
  const tiles = useMemo<LetterTile[]>(() => {
    return question.scrambledLetters.map((char, index) => ({
      tileId: `tile_${index}`,
      character: char,
    }))
  }, [question.scrambledLetters])

  const wordLength = question.scrambledLetters.length

  const layout = useMemo(
    () =>
      computeWordScrambleLayout({
        tiles,
        wordLength,
        hasAudio: Boolean(question.audioUrl),
        hasIllustration: Boolean(question.imageUrl),
        promptHeight,
      }),
    [tiles, wordLength, question.audioUrl, question.imageUrl, promptHeight],
  )

  // Khởi tạo các slot ban đầu nếu ở chế độ review
  const initialSlots = useMemo<(string | null)[]>(() => {
    if (mode === 'review' && 'completedWord' in props && props.completedWord) {
      const chars = [...props.completedWord]
      const usedTiles = new Set<string>()
      const slots: (string | null)[] = []

      chars.forEach((c) => {
        const found = tiles.find(
          (t) => t.character.toUpperCase() === c.toUpperCase() && !usedTiles.has(t.tileId),
        )
        if (found) {
          usedTiles.add(found.tileId)
          slots.push(found.tileId)
        } else {
          slots.push(null)
        }
      })
      while (slots.length < wordLength) slots.push(null)
      return slots
    }
    return new Array(wordLength).fill(null)
  }, [mode, props, tiles, wordLength])

  const [state, dispatch] = useReducer(
    wordScrambleReducer,
    undefined,
    () => createWordScrambleState(wordLength, initialSlots, mode === 'review'),
  )

  // Reset state when question changes
  const lastQuestionId = useRef(question.id)
  useEffect(() => {
    if (lastQuestionId.current !== question.id) {
      lastQuestionId.current = question.id
      dispatch({ type: 'RESET', wordLength })
    }
  }, [question.id, wordLength])

  const playAudio = useQuestionAudio(question.audioUrl)
  const illustration = useIllustration(question.imageUrl)

  const handleTileDragEnd = useCallback(
    (tileId: string, pos: Point) => {
      if (state.locked || disabled) return
      const center: Point = { x: pos.x + TILE_SIZE / 2, y: pos.y + TILE_SIZE / 2 }

      // Tìm xem rơi vào slot nào
      const targetSlotIndex = layout.slotBounds.findIndex(
        (bounds) =>
          center.x >= bounds.x &&
          center.x <= bounds.x + bounds.width &&
          center.y >= bounds.y &&
          center.y <= bounds.y + bounds.height,
      )

      if (targetSlotIndex !== -1) {
        playSound('/sounds/click.wav')
        dispatch({ type: 'PLACE_TILE', tileId, slotIndex: targetSlotIndex })
      } else {
        // Rơi ra ngoài slot: nếu chữ này đang trong slot thì trả về khay
        if (state.slots.includes(tileId)) {
          dispatch({ type: 'RETURN_TILE', tileId })
        }
      }
    },
    [layout.slotBounds, state.locked, state.slots, disabled],
  )

  const handleTileTap = useCallback(
    (tileId: string) => {
      if (state.locked || disabled) return
      playSound('/sounds/click.wav')
      dispatch({ type: 'SELECT_TILE', tileId })
    },
    [state.locked, disabled],
  )

  const handleSlotTap = useCallback(
    (slotIndex: number) => {
      if (state.locked || disabled) return
      const currentTileId = state.slots[slotIndex]

      if (currentTileId) {
        // Bấm vào ô đã có chữ -> trả chữ về khay
        playSound('/sounds/click.wav')
        dispatch({ type: 'RETURN_TILE', tileId: currentTileId })
      } else if (state.selectedTileId) {
        // Bấm vào ô trống khi đang chọn chữ -> đặt chữ vào ô
        playSound('/sounds/click.wav')
        dispatch({ type: 'PLACE_TILE', tileId: state.selectedTileId, slotIndex })
      }
    },
    [state.locked, state.slots, state.selectedTileId, disabled],
  )

  const handleSubmit = useCallback(async () => {
    if (!canSubmit(state.slots) || state.locked || state.submitting || disabled) {
      return
    }

    const constructedWord = constructWord(state.slots, tiles)

    if (mode === 'preview') {
      const correctWord = 'correctWord' in question ? (question.correctWord as string) : ''
      const isCorrect = isWordMatch(constructedWord, correctWord)
      const result: WordScrambleAnswerResult = { isCorrect, correctWord }
      dispatch({ type: 'SUBMIT_SUCCESS', result })
      showFeedback(isCorrect)
      props.onAnswered?.(constructedWord)
    } else if (mode === 'play') {
      dispatch({ type: 'START_SUBMIT' })
      try {
        const result = await props.onAnswered(constructedWord)
        dispatch({ type: 'SUBMIT_SUCCESS', result })
        showFeedback(result.isCorrect)
      } catch {
        dispatch({ type: 'SUBMIT_ERROR' })
      }
    }
  }, [state.slots, state.locked, state.submitting, tiles, mode, question, props, showFeedback, disabled])

  const tileMap = useMemo(() => new Map(tiles.map((t) => [t.tileId, t])), [tiles])

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

        {/* Các ô từ mục tiêu (Word Slots) */}
        {layout.slotBounds.map((bounds, index) => {
          const filledTileId = state.slots[index]
          const filledTile = filledTileId ? tileMap.get(filledTileId) : null
          const isSlotHighlighted = Boolean(state.selectedTileId && !filledTileId)

          return (
            <Group
              key={index}
              x={bounds.x}
              y={bounds.y}
              onClick={() => handleSlotTap(index)}
              onTap={() => handleSlotTap(index)}
            >
              {/* Khung ô */}
              <Rect
                width={bounds.width}
                height={bounds.height}
                cornerRadius={14}
                fill={palette.surface}
                stroke={isSlotHighlighted ? palette.accent : palette.outline}
                strokeWidth={isSlotHighlighted ? 3 : 2}
                dash={!filledTile ? [6, 4] : undefined}
              />

              {/* Đường gạch dưới đáy ô */}
              <Line
                points={[10, bounds.height - 12, bounds.width - 10, bounds.height - 12]}
                stroke={palette.disabledStroke}
                strokeWidth={2}
                listening={false}
              />

              {/* Chữ cái trong ô nếu đã đặt */}
              {filledTile && (
                <Text
                  text={filledTile.character}
                  fontSize={36}
                  fontStyle="bold"
                  fill={palette.ink}
                  width={bounds.width}
                  height={bounds.height - 10}
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              )}
            </Group>
          )
        })}

        {/* Khay chứa chữ cái (Tray) */}
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
            text="Khay chữ cái (Chạm hoặc kéo vào ô)"
            fontSize={14}
            fill={palette.inkSoft}
            x={16}
            y={6}
            listening={false}
          />
        </Group>

        {/* Render các thẻ chữ cái (Letter tiles) trong khay */}
        {tiles.map((tile) => {
          const isPlaced = state.slots.includes(tile.tileId)
          // Nếu chữ đã nằm trong slot thì không vẽ ở khay nữa (đã vẽ trong slot)
          if (isPlaced) return null

          const trayPos = layout.trayPositions[tile.tileId] ?? { x: 0, y: 0 }
          const isSelected = state.selectedTileId === tile.tileId

          return (
            <Group
              key={tile.tileId}
              x={trayPos.x}
              y={trayPos.y}
              draggable={!state.locked && !disabled}
              onClick={() => handleTileTap(tile.tileId)}
              onTap={() => handleTileTap(tile.tileId)}
              onDragStart={(e) => {
                e.target.moveToTop()
              }}
              onDragEnd={(e) => {
                handleTileDragEnd(tile.tileId, { x: e.target.x(), y: e.target.y() })
                e.target.position({ x: trayPos.x, y: trayPos.y })
              }}
            >
              <Rect
                width={TILE_SIZE}
                height={TILE_SIZE}
                cornerRadius={12}
                fill={palette.surface}
                stroke={isSelected ? palette.accent : palette.primaryStrong}
                strokeWidth={isSelected ? 4 : 2}
                shadowColor={palette.ink}
                shadowBlur={isSelected ? 8 : 4}
                shadowOpacity={isSelected ? 0.25 : 0.15}
                shadowOffset={{ x: 0, y: 2 }}
              />
              <Text
                text={tile.character}
                fontSize={34}
                fontStyle="bold"
                fill={palette.ink}
                width={TILE_SIZE}
                height={TILE_SIZE}
                align="center"
                verticalAlign="middle"
                listening={false}
              />
            </Group>
          )
        })}

        {/* Nút «Xong rồi!» */}
        {!state.locked && mode !== 'review' && (
          <ConfirmButton
            y={layout.confirmY}
            enabled={canSubmit(state.slots) && !state.submitting && !disabled}
            onPress={handleSubmit}
          />
        )}

        {/* Phản hồi sau khi chấm */}
        {state.result && (
          <Text
            text={
              state.result.isCorrect
                ? 'Tuyệt vời! Bé đã ghép đúng từ!'
                : state.result.correctWord
                  ? `Từ đúng là: ${state.result.correctWord}`
                  : 'Bé quan sát kỹ và cùng ghép lại nhé!'
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
