import { describe, expect, it } from 'vitest'
import type { GameSummary } from '../types/game-summary.types'
import {
  EMPTY_LIST_FILTERS,
  filterGames,
  hasActiveFilter,
  normalizeSearchText,
} from './gameFilters'

const game = (overrides: Partial<GameSummary>): GameSummary => ({
  gameId: 'g',
  title: 'Trò chơi',
  gameType: 'QUIZ',
  subject: 'MATH',
  gradeLevel: 'GRADE_1',
  status: 'DRAFT',
  shareCode: null,
  shareUrl: null,
  thumbnailUrl: null,
  updatedAt: '2026-10-13T00:00:00Z',
  ...overrides,
})

const GAMES = [
  game({ gameId: '1', title: 'Đếm số đến 10' }),
  game({ gameId: '2', title: 'Nhận biết chữ cái', subject: 'VIETNAMESE', gradeLevel: 'KINDERGARTEN', status: 'PUBLISHED' }),
  game({ gameId: '3', title: 'Từ vựng con vật', subject: 'ENGLISH', gradeLevel: 'GRADE_2' }),
]

const ids = (list: GameSummary[]) => list.map((item) => item.gameId)

describe('normalizeSearchText', () => {
  it('bỏ dấu, đổi Đ/đ thành d và chữ thường', () => {
    expect(normalizeSearchText('Đếm số ĐẾN')).toBe('dem so den')
    expect(normalizeSearchText('  ươn, ương  ')).toBe('uon, uong')
  })
})

describe('filterGames', () => {
  it('không lọc gì thì trả đủ danh sách', () => {
    expect(ids(filterGames(GAMES, EMPTY_LIST_FILTERS))).toEqual(['1', '2', '3'])
  })

  it('tìm theo tên không phân biệt dấu và hoa thường', () => {
    expect(ids(filterGames(GAMES, { ...EMPTY_LIST_FILTERS, q: 'dem so' }))).toEqual(['1'])
    expect(ids(filterGames(GAMES, { ...EMPTY_LIST_FILTERS, q: 'CHU CAI' }))).toEqual(['2'])
    expect(ids(filterGames(GAMES, { ...EMPTY_LIST_FILTERS, q: 'con vat' }))).toEqual(['3'])
  })

  it('lọc theo trạng thái, môn, khối lớp', () => {
    expect(ids(filterGames(GAMES, { ...EMPTY_LIST_FILTERS, status: 'PUBLISHED' }))).toEqual(['2'])
    expect(ids(filterGames(GAMES, { ...EMPTY_LIST_FILTERS, subject: 'ENGLISH' }))).toEqual(['3'])
    expect(ids(filterGames(GAMES, { ...EMPTY_LIST_FILTERS, grade: 'KINDERGARTEN' }))).toEqual(['2'])
  })

  it('kết hợp nhiều điều kiện thì phải thỏa tất cả', () => {
    expect(ids(filterGames(GAMES, { q: 'so', status: 'DRAFT', subject: 'MATH', grade: 'GRADE_1' }))).toEqual(['1'])
    expect(ids(filterGames(GAMES, { q: 'so', status: 'PUBLISHED', subject: 'MATH', grade: 'GRADE_1' }))).toEqual([])
  })

  it('từ khóa chỉ có khoảng trắng coi như không tìm', () => {
    expect(ids(filterGames(GAMES, { ...EMPTY_LIST_FILTERS, q: '   ' }))).toEqual(['1', '2', '3'])
  })
})

describe('hasActiveFilter', () => {
  it('đúng khi có ít nhất một điều kiện', () => {
    expect(hasActiveFilter(EMPTY_LIST_FILTERS)).toBe(false)
    expect(hasActiveFilter({ ...EMPTY_LIST_FILTERS, q: 'a' })).toBe(true)
    expect(hasActiveFilter({ ...EMPTY_LIST_FILTERS, grade: 'GRADE_3' })).toBe(true)
  })
})
