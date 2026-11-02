import type { GameType, Subject } from '../../types/game-dsl.types'
import type { Theme } from './types'

/** Theme mặc định và biểu tượng nền tảng khi theme chưa có nhân vật. */
export const DEFAULT_THEME: Theme = { id: 'default', name: 'Mặc định', mascotBase: null, progress: { filled: '★', empty: '☆' } }
export const PLATFORM_MASCOT = '🙂'

export const THEMES: ReadonlyMap<string, Theme> = new Map(
  [
    DEFAULT_THEME,
    { id: 'bee', name: 'Ong vàng', mascotBase: '🐝', progress: { filled: '🍯', empty: '⚪' } },
    { id: 'rabbit', name: 'Thỏ con', mascotBase: '🐰', progress: { filled: '🥕', empty: '⚪' } },
    { id: 'owl', name: 'Cú mèo', mascotBase: '🦉', progress: { filled: '⭐', empty: '☆' } },
  ].map((theme) => [theme.id, theme]),
)

/**
 * Luật chọn theme mặc định, xét từ trên xuống, luật đầu tiên khớp thì dùng. Luật khớp khi MỌI trường nó nêu đều khớp (bỏ trống là khớp tất cả),
 * nên luật theo cả loại game lẫn môn đặt trước luật chỉ theo môn.
 */
export interface ThemeRule {
  gameType?: GameType
  subject?: Subject
  themeId: string
}

export const THEME_RULES: readonly ThemeRule[] = [
  { subject: 'MATH', themeId: 'bee' },
  { subject: 'VIETNAMESE', themeId: 'rabbit' },
  { subject: 'ENGLISH', themeId: 'owl' },
]
