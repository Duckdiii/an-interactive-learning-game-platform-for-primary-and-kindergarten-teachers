import type { GameSummary } from '../types/game-summary.types'

export interface GameListFilters {
  q: string
  status: string
  subject: string
  grade: string
}

export const EMPTY_LIST_FILTERS: GameListFilters = {
  q: '',
  status: '',
  subject: '',
  grade: '',
}

// Bỏ dấu tiếng Việt và chữ hoa để "dem so" tìm ra "Đếm số": giáo viên gõ trên điện thoại hay không gõ dấu.
export function normalizeSearchText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
}

export function filterGames(
  games: ReadonlyArray<GameSummary>,
  filters: GameListFilters,
) {
  const query = normalizeSearchText(filters.q)

  return games.filter(
    (game) =>
      (!filters.status || game.status === filters.status) &&
      (!filters.subject || game.subject === filters.subject) &&
      (!filters.grade || game.gradeLevel === filters.grade) &&
      (!query || normalizeSearchText(game.title).includes(query)),
  )
}

export const hasActiveFilter = (filters: GameListFilters) =>
  Object.values(filters).some((value) => value !== '')
