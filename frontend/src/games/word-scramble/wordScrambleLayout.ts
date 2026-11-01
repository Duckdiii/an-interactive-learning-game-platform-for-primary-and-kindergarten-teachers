import { AUDIO_BUTTON_HEIGHT, ILLUSTRATION_SIZE, STAGE_WIDTH } from '../common/mediaLayout'
import { minCardHeightFor } from '../matching/matchingLayout'
import type { Bounds, LetterTile, Point } from './wordScrambleTypes'

export const DEFAULT_TILE_SIZE = 68
export const DEFAULT_SLOT_WIDTH = 72
export const DEFAULT_SLOT_HEIGHT = 76
export const DEFAULT_CONFIRM_BUTTON_HEIGHT = 72
export const TILE_SIZE = 68
export const SLOT_WIDTH = 72
export const SLOT_HEIGHT = 76
export const CONFIRM_BUTTON_HEIGHT = 72
export const GAP = 12
export const PADDING = 20

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
  confirmHeight: number
  confirmWidth: number
  tileSize: number
  slotWidth: number
  slotHeight: number
}

export function computeWordScrambleLayout(params: {
  tiles: LetterTile[]
  wordLength: number
  hasAudio: boolean
  hasIllustration: boolean
  promptHeight?: number
  minTouchPx?: number
  scale?: number
}): WordScrambleBoardLayout {
  const {
    tiles,
    wordLength,
    hasAudio,
    hasIllustration,
    promptHeight = 36,
    minTouchPx = 64,
    scale = 1,
  } = params

  const minTargetSize = minCardHeightFor(minTouchPx, scale > 0 ? scale : 1)
  const slotWidth = Math.max(DEFAULT_SLOT_WIDTH, minTargetSize)
  const slotHeight = Math.max(DEFAULT_SLOT_HEIGHT, minTargetSize)
  const tileSize = Math.max(DEFAULT_TILE_SIZE, minTargetSize)
  const confirmHeight = Math.max(DEFAULT_CONFIRM_BUTTON_HEIGHT, minTargetSize)
  const confirmWidth = Math.max(260, Math.round(260 * (confirmHeight / DEFAULT_CONFIRM_BUTTON_HEIGHT)))

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

  // Bố trí các ô slot mục tiêu (Word Slots) có hỗ trợ xuống dòng khi từ dài
  const availableWidth = width - PADDING * 2
  const slotsPerRow = Math.max(1, Math.floor((availableWidth + GAP) / (slotWidth + GAP)))
  const totalSlotRows = Math.max(1, Math.ceil(wordLength / slotsPerRow))
  const startSlotY = currentY

  const slotBounds: Bounds[] = Array.from({ length: wordLength }, (_, i) => {
    const row = Math.floor(i / slotsPerRow)
    const col = i % slotsPerRow
    const rowCount = Math.min(slotsPerRow, wordLength - row * slotsPerRow)
    const rowWidth = rowCount * slotWidth + (rowCount - 1) * GAP
    const startX = (width - rowWidth) / 2
    return {
      x: startX + col * (slotWidth + GAP),
      y: startSlotY + row * (slotHeight + GAP),
      width: slotWidth,
      height: slotHeight,
    }
  })

  currentY += totalSlotRows * (slotHeight + GAP) + 20

  // Bố trí khay chữ cái (Letter Tiles Tray)
  const trayColumns = Math.max(1, Math.floor((availableWidth - 24) / (tileSize + GAP)))
  const trayRows = Math.max(1, Math.ceil(tiles.length / trayColumns))
  const trayHeight = 32 + trayRows * (tileSize + GAP)
  const trayY = currentY

  const trayPositions: Record<string, Point> = {}
  tiles.forEach((tile, index) => {
    const row = Math.floor(index / trayColumns)
    const rowCount = Math.min(trayColumns, tiles.length - row * trayColumns)
    const rowWidth = rowCount * tileSize + (rowCount - 1) * GAP
    const startX = (width - rowWidth) / 2
    trayPositions[tile.tileId] = {
      x: startX + (index % trayColumns) * (tileSize + GAP),
      y: trayY + 16 + row * (tileSize + GAP),
    }
  })

  currentY += trayHeight + 20

  // Nút xác nhận «Xong rồi!»
  const confirmY = currentY
  currentY += confirmHeight + PADDING

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
    confirmHeight,
    confirmWidth,
    tileSize,
    slotWidth,
    slotHeight,
  }
}
