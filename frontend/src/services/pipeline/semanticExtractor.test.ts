import { describe, expect, it } from 'vitest'
import { extractSemantics } from './semanticExtractor'

describe('extractSemantics (Chặng 1: Semantic NLU/NER Extraction)', () => {
  it('giải quyết mâu thuẫn ngữ cảnh (Context Disambiguation): Bác nông dân nuôi đàn vịt bơi ở bờ ao -> FARM', () => {
    const result = extractSemantics('Bác nông dân nuôi đàn vịt bơi ở bờ ao')

    expect(result.theme).toBe('FARM')
    expect(result.themeKey).toBe('farm')
    expect(result.backgroundUrl).toBe('/assets/themes/farm/bg-farm.svg')
    expect(result.mascotUrl).toBe('/assets/mascots/pippy.svg')
    expect(result.mascotName).toBe('Gà Con Pippy')
    expect(result.reasoning.toLowerCase()).toContain('bác nông dân')
    expect(result.visualEntities.some((e) => e.name === 'bác nông dân' && e.entityType === 'spatial_anchor')).toBe(true)
    expect(result.visualEntities.some((e) => e.name === 'đàn vịt' && e.entityType === 'animal')).toBe(true)
  })

  it('xác định không gian biển sâu: Tàu thám hiểm lặn sâu xuống rãnh Mariana tối tăm -> OCEAN', () => {
    const result = extractSemantics('Tàu thám hiểm lặn sâu xuống rãnh Mariana tối tăm')

    expect(result.theme).toBe('OCEAN')
    expect(result.themeKey).toBe('ocean')
    expect(result.backgroundUrl).toBe('/assets/themes/ocean/bg-ocean.svg')
    expect(result.mascotUrl).toBe('/assets/mascots/sam.svg')
    expect(result.mascotName).toBe('Rùa Biển Sam')
    expect(result.reasoning).toContain('rãnh mariana')
    expect(result.visualEntities.some((e) => e.name === 'rãnh mariana')).toBe(true)
  })

  it('xác định không gian học tập (CLASSROOM tools): Bé sắp xếp hộp bút, thước kẻ, compa -> fallback JUNGLE', () => {
    const result = extractSemantics('Bé sắp xếp hộp bút, thước kẻ, compa')

    expect(result.theme).toBe('JUNGLE')
    expect(result.themeKey).toBe('jungle')
    expect(result.backgroundUrl).toBe('/assets/themes/jungle/bg-jungle.svg')
    expect(result.mascotUrl).toBe('/assets/mascots/mimi.svg')
    expect(result.reasoning).toContain('Lớp học')
    expect(result.visualEntities.some((e) => e.name === 'hộp bút')).toBe(true)
    expect(result.visualEntities.some((e) => e.name === 'thước kẻ')).toBe(true)
    expect(result.visualEntities.some((e) => e.name === 'compa')).toBe(true)
  })

  it('xác định không gian sinh vật biển: Bé nối các sinh vật biển: cá hề, rùa biển, sao biển -> OCEAN', () => {
    const result = extractSemantics('Bé nối các sinh vật biển: cá hề, rùa biển, sao biển')

    expect(result.theme).toBe('OCEAN')
    expect(result.themeKey).toBe('ocean')
    expect(result.visualEntities.some((e) => e.name === 'cá hề')).toBe(true)
    expect(result.visualEntities.some((e) => e.name === 'rùa biển')).toBe(true)
    expect(result.visualEntities.some((e) => e.name === 'sao biển')).toBe(true)
    expect(result.scores.OCEAN).toBeGreaterThan(0)
  })

  it('xác định không gian vũ trụ: Phi thuyền bay qua hành tinh và đĩa bay UFO -> SPACE', () => {
    const result = extractSemantics('Phi thuyền bay qua hành tinh và đĩa bay UFO')

    expect(result.theme).toBe('SPACE')
    expect(result.themeKey).toBe('space')
    expect(result.backgroundUrl).toBe('/assets/themes/space/bg-space.svg')
    expect(result.mascotUrl).toBe('/assets/mascots/leo.svg')
    expect(result.visualEntities.some((e) => e.name === 'phi thuyền')).toBe(true)
    expect(result.visualEntities.some((e) => e.name === 'hành tinh')).toBe(true)
    expect(result.scores.SPACE).toBeGreaterThan(0)
  })

  it('fallback an toàn khi văn bản không chứa từ khóa không gian cụ thể -> JUNGLE', () => {
    const result = extractSemantics('')

    expect(result.theme).toBe('JUNGLE')
    expect(result.themeKey).toBe('jungle')
    expect(result.backgroundUrl).toBe('/assets/themes/jungle/bg-jungle.svg')
    expect(result.visualEntities).toHaveLength(0)
    expect(result.reasoning).toContain('Rừng Xanh')
  })
})
