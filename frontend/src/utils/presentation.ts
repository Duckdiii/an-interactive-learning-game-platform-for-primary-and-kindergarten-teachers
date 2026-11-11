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
  carrier: PresentationCarrier
  layout: PresentationLayout
}

/**
 * @param saved metadata.presentation (có thể thiếu)
 * @param themeId thế giới đang dùng (đã giải theo saved.world, chủ đề, môn...)
 * @param seed chuỗi riêng của game (gameId, hoặc tên game khi chưa lưu)
 */
export function resolvePresentation(saved: GamePresentation | undefined, themeId: string, seed: string): ResolvedPresentation {
  const hash = seedOf(seed)
  const carriers = CARRIERS_BY_WORLD[themeId] ?? DEFAULT_CARRIERS
  return {
    carrier: saved?.carrier ?? carriers[hash % carriers.length],
    layout: saved?.layout ?? PRESENTATION_LAYOUTS[Math.floor(hash / 7) % PRESENTATION_LAYOUTS.length],
  }
}
