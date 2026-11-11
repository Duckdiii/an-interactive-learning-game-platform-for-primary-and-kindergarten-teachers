// Cách trình bày của một game (metadata.presentation): dùng giá trị đã lưu, thiếu thì chọn cố định theo game để các game không giống
// hệt nhau mà mở lại vẫn y như cũ. Hàm thuần, có test.
import type { GamePresentation, PresentationCarrier, PresentationLayout } from '../types/game-dsl.types'

export const PRESENTATION_WORLDS = ['farm', 'ocean', 'jungle', 'space'] as const
export const PRESENTATION_CARRIERS: readonly PresentationCarrier[] = ['balloon', 'bubble', 'planet', 'fruit', 'card', 'fish', 'flower']
export const PRESENTATION_LAYOUTS: readonly PresentationLayout[] = ['scatter', 'row', 'arc']

// Vật hợp với từng thế giới (theme id); theme khác (bee, rabbit, owl, mặc định) dùng nhóm chung.
const CARRIERS_BY_WORLD: Record<string, readonly PresentationCarrier[]> = {
  farm: ['fruit', 'balloon', 'flower'],
  ocean: ['fish', 'bubble'],
  jungle: ['fruit', 'flower', 'balloon'],
  space: ['planet', 'balloon'],
}
const DEFAULT_CARRIERS: readonly PresentationCarrier[] = ['balloon', 'card', 'flower']

/** Băm chuỗi thành số không âm (FNV-1a): cùng game luôn ra cùng số. */
export function seedOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export interface ResolvedPresentation {
  /** Thế giới (theme id) đã giải, dùng để chọn kiểu thẻ (cardStyleOf). */
  world: string
  carrier: PresentationCarrier
  layout: PresentationLayout
}

/** Kiểu thẻ theo thế giới (Matching, Memory): biểu tượng và màu mặt úp, độ bo góc. */
export interface CardStyle {
  emblem: string
  backFrom: string
  backTo: string
  radius: number
}

const CARD_STYLES: Record<string, CardStyle> = {
  farm: { emblem: '🌻', backFrom: '#86efac', backTo: '#16a34a', radius: 14 },
  ocean: { emblem: '🐚', backFrom: '#7dd3fc', backTo: '#2563eb', radius: 28 },
  jungle: { emblem: '🍃', backFrom: '#bef264', backTo: '#4d7c0f', radius: 18 },
  space: { emblem: '🪐', backFrom: '#a5b4fc', backTo: '#4338ca', radius: 24 },
}
const DEFAULT_CARD_STYLE: CardStyle = { emblem: '⭐', backFrom: '#fbbf24', backTo: '#f97316', radius: 20 }

// hasOwn: id lạ như 'constructor' không được rơi vào thuộc tính của Object.prototype.
export const cardStyleOf = (world: string | undefined): CardStyle =>
  world && Object.hasOwn(CARD_STYLES, world) ? CARD_STYLES[world] : DEFAULT_CARD_STYLE

/**
 * @param saved metadata.presentation (có thể thiếu)
 * @param themeId thế giới đang dùng (đã giải theo saved.world, chủ đề, môn...)
 * @param seed chuỗi riêng của game (gameId, hoặc tên game khi chưa lưu)
 */
export function resolvePresentation(saved: GamePresentation | undefined, themeId: string, seed: string): ResolvedPresentation {
  const hash = seedOf(seed)
  const carriers = CARRIERS_BY_WORLD[themeId] ?? DEFAULT_CARRIERS
  return {
    world: themeId,
    carrier: saved?.carrier ?? carriers[hash % carriers.length],
    layout: saved?.layout ?? PRESENTATION_LAYOUTS[Math.floor(hash / 7) % PRESENTATION_LAYOUTS.length],
  }
}
