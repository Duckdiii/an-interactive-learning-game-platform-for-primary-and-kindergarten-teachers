import { AUDIO_BUTTON_HEIGHT, ILLUSTRATION_SIZE, STAGE_WIDTH } from '../common/mediaLayout'
import type { Bounds, LetterTile, Point } from './wordScrambleTypes'

export const TILE_SIZE = 68
export const SLOT_WIDTH = 72
export const SLOT_HEIGHT = 76
export const GAP = 12
export const PADDING = 20
export const CONFIRM_BUTTON_WIDTH = 260
export const CONFIRM_BUTTON_HEIGHT = 72

export interface WordScrambleBoardLayout {
  width: number
  height: number
  promptY: number
  promptHeight: number
  illustrationY: number | null
  audioY: number | null
  slotBounds: Bounds[]
  trayBounds: Bounds
  trayPositions: Record<string, Point>
  confirmY: number
}

export function computeWordScrambleLayout(params: {
  tiles: LetterTile[]
  wordLength: number
  hasAudio: boolean
  hasIllustration: boolean
  promptHeight?: number
}): WordScrambleBoardLayout {
  const { tiles, wordLength, hasAudio, hasIllustration, promptHeight = 36 } = params
  const width = STAGE_WIDTH
  let currentY = PADDING

  const promptY = currentY
  currentY += promptHeight + 12

  let illustrationY: number | null = null
  if (hasIllustration) {
    illustrationY = currentY
    currentY += ILLUSTRATION_SIZE + 12
  }

  let audioY: number | null = null
  if (hasAudio) {
    audioY = currentY
    currentY += AUDIO_BUTTON_HEIGHT + 16
  }

  // Bố trí các ô slot mục tiêu (Word Slots)
  const totalSlotsWidth = wordLength * SLOT_WIDTH + (wordLength - 1) * GAP
  const startSlotX = Math.max(PADDING, (width - totalSlotsWidth) / 2)
  const slotY = currentY

  const slotBounds: Bounds[] = Array.from({ length: wordLength }, (_, i) => ({
    x: startSlotX + i * (SLOT_WIDTH + GAP),
    y: slotY,
    width: SLOT_WIDTH,
    height: SLOT_HEIGHT,
  }))

  currentY += SLOT_HEIGHT + 28

  // Bố trí khay chữ cái (Letter Tiles Tray)
  const availableWidth = width - PADDING * 2
  const trayColumns = Math.max(1, Math.floor((availableWidth - 24) / (TILE_SIZE + GAP)))
  const trayRows = Math.max(1, Math.ceil(tiles.length / trayColumns))
  const trayHeight = 32 + trayRows * (TILE_SIZE + GAP)
  const trayY = currentY

  const trayPositions: Record<string, Point> = {}
  tiles.forEach((tile, index) => {
    const row = Math.floor(index / trayColumns)
    const rowCount = Math.min(trayColumns, tiles.length - row * trayColumns)
    const rowWidth = rowCount * TILE_SIZE + (rowCount - 1) * GAP
    const startX = (width - rowWidth) / 2
    trayPositions[tile.tileId] = {
      x: startX + (index % trayColumns) * (TILE_SIZE + GAP),
      y: trayY + 16 + row * (TILE_SIZE + GAP),
    }
  })

  currentY += trayHeight + 20

  // Nút xác nhận «Xong rồi!»
  const confirmY = currentY
  currentY += CONFIRM_BUTTON_HEIGHT + PADDING

  return {
    width,
    height: currentY,
    promptY,
    promptHeight,
    illustrationY,
    audioY,
    slotBounds,
    trayBounds: {
      x: PADDING,
      y: trayY,
      width: availableWidth,
      height: trayHeight,
    },
    trayPositions,
    confirmY,
  }
}
