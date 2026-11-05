import type { GameType, Subject } from '../../types/game-dsl.types'
import type { Theme } from './types'

/** Theme mặc định và biểu tượng nền tảng khi theme chưa có nhân vật. */
export const DEFAULT_THEME: Theme = {
  id: 'default',
  name: 'Mặc định',
  mascotBase: null,
  mascotAvatar: '/assets/mascots/pippy.svg',
  bgUrl: '/assets/themes/farm/bg-farm.svg',
  progress: { filled: '★', empty: '☆' },
}

export const PLATFORM_MASCOT = '🙂'

export const THEMES: ReadonlyMap<string, Theme> = new Map(
  [
    DEFAULT_THEME,
    // 4 Chủ đề chuẩn hóa K-5 Stage 2.5
    {
      id: 'farm',
      name: 'Nông Trại Vui Vẻ',
      mascotBase: '🐥',
      mascotAvatar: '/assets/mascots/pippy.svg',
      bgUrl: '/assets/themes/farm/bg-farm.svg',
      progress: { filled: '🌽', empty: '⚪' },
    },
    {
      id: 'ocean',
      name: 'Đại Dương Kỳ Thú',
      mascotBase: '🐢',
      mascotAvatar: '/assets/mascots/sam.svg',
      bgUrl: '/assets/themes/ocean/bg-ocean.svg',
      progress: { filled: '🐚', empty: '⚪' },
    },
    {
      id: 'jungle',
      name: 'Rừng Xanh Thám Hiểm',
      mascotBase: '🐱',
      mascotAvatar: '/assets/mascots/mimi.svg',
      bgUrl: '/assets/themes/jungle/bg-jungle.svg',
      progress: { filled: '🍃', empty: '⚪' },
    },
    {
      id: 'space',
      name: 'Du Hành Vũ Trụ',
      mascotBase: '👨‍🚀',
      mascotAvatar: '/assets/mascots/leo.svg',
      bgUrl: '/assets/themes/space/bg-space.svg',
      progress: { filled: '⭐', empty: '⚪' },
    },

    // Legacy themes & aliases
    {
      id: 'bee',
      name: 'Ong vàng',
      mascotBase: '🐝',
      mascotAvatar: '/assets/mascots/mimi.svg',
      bgUrl: '/assets/themes/jungle/bg-jungle.svg',
      progress: { filled: '🍯', empty: '⚪' },
    },
    {
      id: 'rabbit',
      name: 'Thỏ con',
      mascotBase: '🐰',
      mascotAvatar: '/assets/mascots/pippy.svg',
      bgUrl: '/assets/themes/farm/bg-farm.svg',
      progress: { filled: '🥕', empty: '⚪' },
    },
    {
      id: 'owl',
      name: 'Cú mèo',
      mascotBase: '🦉',
      mascotAvatar: '/assets/mascots/leo.svg',
      bgUrl: '/assets/themes/space/bg-space.svg',
      progress: { filled: '⭐', empty: '☆' },
    },
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
