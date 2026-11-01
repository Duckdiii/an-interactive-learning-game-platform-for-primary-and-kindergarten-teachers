import { describe, expect, it } from 'vitest'
import {
  computeWordScrambleLayout,
  CONFIRM_BUTTON_HEIGHT,
  SLOT_WIDTH,
  TILE_SIZE,
} from './wordScrambleLayout'
import {
  isWordMatch,
  normalizeWord,
} from './wordScrambleLogic'
import {
  canSubmit,
  constructWord,
  createWordScrambleState,
  wordScrambleReducer,
} from './wordScrambleReducer'
import type { LetterTile } from './wordScrambleTypes'

describe('Word Scramble Logic (migrated from node test)', () => {
  it('matches words case-insensitively and handles duplicate letters', () => {
    expect(isWordMatch('APPLE', 'apple')).toBe(true)
    expect(isWordMatch('apple', 'APPLE')).toBe(true)
    expect(isWordMatch('aple', 'APPLE')).toBe(false)
  })

  it('normalizes Vietnamese words with accents and whitespace', () => {
    expect(normalizeWord('  Trường  Học ')).toBe('trường học')
    expect(isWordMatch('trường', 'TRƯỜNG')).toBe(true)
    expect(isWordMatch('cá', 'CÁ')).toBe(true)
  })

  it('normalizes decomposed NFD Unicode strings to NFC', () => {
    // 'ca\u0301' is 'cá' decomposed (NFD)
    const nfdWord = 'ca\u0301'
    const nfcWord = 'cá'
    expect(nfdWord).not.toBe(nfcWord)
    expect(nfdWord.normalize('NFC')).toBe(nfcWord)
    expect(isWordMatch(nfdWord, nfcWord)).toBe(true)
    expect(normalizeWord(nfdWord)).toBe(normalizeWord(nfcWord))

    // 'Tr\u01b0\u01a1\u0300ng' is 'Trường' decomposed (NFD)
    const nfdTruong = 'Tr\u01b0\u01a1\u0300ng'
    expect(isWordMatch(nfdTruong, 'TRƯỜNG')).toBe(true)
  })
})

describe('Word Scramble Reducer with Duplicate Letters', () => {
  const word = 'APPLE'
  const tiles: LetterTile[] = [
    { tileId: 't0', character: 'E' },
    { tileId: 't1', character: 'P' },
    { tileId: 't2', character: 'A' },
    { tileId: 't3', character: 'P' },
    { tileId: 't4', character: 'L' },
  ]

  it('handles duplicate letter tiles independently in slots', () => {
    let state = createWordScrambleState(word.length)
    expect(canSubmit(state.slots)).toBe(false)

    // Tap tile A (t2) -> auto-places into slot 0
    state = wordScrambleReducer(state, { type: 'SELECT_TILE', tileId: 't2' })
    expect(state.slots[0]).toBe('t2')

    // Tap first P (t1) -> auto-places into slot 1
    state = wordScrambleReducer(state, { type: 'SELECT_TILE', tileId: 't1' })
    expect(state.slots[1]).toBe('t1')

    // Tap second P (t3) -> auto-places into slot 2
    state = wordScrambleReducer(state, { type: 'SELECT_TILE', tileId: 't3' })
    expect(state.slots[2]).toBe('t3')

    // Tap L (t4) -> auto-places into slot 3
    state = wordScrambleReducer(state, { type: 'SELECT_TILE', tileId: 't4' })
    expect(state.slots[3]).toBe('t4')

    // Tap E (t0) -> auto-places into slot 4
    state = wordScrambleReducer(state, { type: 'SELECT_TILE', tileId: 't0' })
    expect(state.slots[4]).toBe('t0')

    // All slots filled
    expect(canSubmit(state.slots)).toBe(true)
    expect(constructWord(state.slots, tiles)).toBe('APPLE')

    // Tap first P in slot 1 -> removes only first P, leaving second P in slot 2!
    state = wordScrambleReducer(state, { type: 'SELECT_TILE', tileId: 't1' })
    expect(state.slots[1]).toBeNull()
    expect(state.slots[2]).toBe('t3')
    expect(canSubmit(state.slots)).toBe(false)
  })

  it('allows manual placement and swapping of tiles', () => {
    let state = createWordScrambleState(3)
    state = wordScrambleReducer(state, { type: 'PLACE_TILE', tileId: 't0', slotIndex: 2 })
    expect(state.slots[2]).toBe('t0')

    // Moving t0 to slot 0
    state = wordScrambleReducer(state, { type: 'PLACE_TILE', tileId: 't0', slotIndex: 0 })
    expect(state.slots[0]).toBe('t0')
    expect(state.slots[2]).toBeNull()

    // Returning tile
    state = wordScrambleReducer(state, { type: 'RETURN_TILE', tileId: 't0' })
    expect(state.slots[0]).toBeNull()
  })

  it('locks state when submitted', () => {
    let state = createWordScrambleState(word.length)
    state = wordScrambleReducer(state, {
      type: 'SUBMIT_SUCCESS',
      result: { isCorrect: true, correctWord: 'APPLE' },
    })
    expect(state.locked).toBe(true)
    expect(state.result?.isCorrect).toBe(true)

    // Cannot modify when locked
    const lockedState = wordScrambleReducer(state, { type: 'SELECT_TILE', tileId: 't0' })
    expect(lockedState.slots[0]).toBeNull()
  })
})

describe('Word Scramble Layout & Sizing', () => {
  it('guarantees touch target sizes >= 64px for children UX', () => {
    expect(TILE_SIZE).toBeGreaterThanOrEqual(64)
    expect(SLOT_WIDTH).toBeGreaterThanOrEqual(64)
    expect(CONFIRM_BUTTON_HEIGHT).toBeGreaterThanOrEqual(64)
  })

  it('guarantees touch target sizes >= 64px AFTER scaling across various scales', () => {
    const scales = [1.0, 0.85, 0.75, 0.4875, 0.35]
    const tiles: LetterTile[] = [
      { tileId: 't0', character: 'C' },
      { tileId: 't1', character: 'Á' },
    ]

    for (const scale of scales) {
      const layout = computeWordScrambleLayout({
        tiles,
        wordLength: 2,
        hasAudio: false,
        hasIllustration: false,
        minTouchPx: 64,
        scale,
      })

      // Kích thước ô chữ sau khi scale trên màn hình
      expect(layout.slotWidth * scale).toBeGreaterThanOrEqual(64 - 1e-4)
      expect(layout.slotHeight * scale).toBeGreaterThanOrEqual(64 - 1e-4)

      // Kích thước thẻ chữ khay sau khi scale
      expect(layout.tileSize * scale).toBeGreaterThanOrEqual(64 - 1e-4)

      // Chiều cao nút xác nhận sau khi scale
      expect(layout.confirmHeight * scale).toBeGreaterThanOrEqual(64 - 1e-4)
    }
  })

  it('supports word lengths from 1 to 15 without overflowing stage width or bounds', () => {
    const alphabet = 'A B C D E F G H I K L M N O P'.split(' ')

    for (let length = 1; length <= 15; length++) {
      const tiles: LetterTile[] = Array.from({ length }, (_, i) => ({
        tileId: `t_${i}`,
        character: alphabet[i],
      }))

      // Thử ở cả desktop (scale 1.0) lẫn mobile 390px (scale 0.4875)
      for (const scale of [1.0, 0.4875]) {
        const layout = computeWordScrambleLayout({
          tiles,
          wordLength: length,
          hasAudio: true,
          hasIllustration: true,
          minTouchPx: 64,
          scale,
        })

        // Mọi slot phải nằm trọn trong stageWidth (không tràn ngang)
        expect(layout.slotBounds).toHaveLength(length)
        for (const slot of layout.slotBounds) {
          expect(slot.x).toBeGreaterThanOrEqual(0)
          expect(slot.x + slot.width).toBeLessThanOrEqual(layout.width)
          expect(slot.y + slot.height).toBeLessThanOrEqual(layout.height)
        }

        // Mọi thẻ trong khay phải nằm trong chiều rộng stage
        for (const tile of tiles) {
          const pos = layout.trayPositions[tile.tileId]
          expect(pos.x).toBeGreaterThanOrEqual(0)
          expect(pos.x + layout.tileSize).toBeLessThanOrEqual(layout.width)
          expect(pos.y + layout.tileSize).toBeLessThanOrEqual(layout.height)
        }

        // Nút xác nhận nằm dưới khay và nằm trọn trong stage
        expect(layout.confirmY).toBeGreaterThanOrEqual(layout.trayBounds.y + layout.trayBounds.height)
        expect(layout.confirmY + layout.confirmHeight).toBeLessThanOrEqual(layout.height)
      }
    }
  })

  it('computes slot bounds and tray bounds correctly', () => {
    const tiles: LetterTile[] = [
      { tileId: 't0', character: 'C' },
      { tileId: 't1', character: 'Á' },
    ]
    const layout = computeWordScrambleLayout({
      tiles,
      wordLength: 2,
      hasAudio: true,
      hasIllustration: true,
    })

    expect(layout.slotBounds).toHaveLength(2)
    expect(layout.slotBounds[0].width).toBeGreaterThanOrEqual(64)
    expect(layout.slotBounds[1].x).toBeGreaterThan(layout.slotBounds[0].x)
    expect(layout.trayBounds.y).toBeGreaterThan(layout.slotBounds[0].y + layout.slotBounds[0].height)
    expect(layout.confirmY).toBeGreaterThan(layout.trayBounds.y + layout.trayBounds.height)
  })
})
