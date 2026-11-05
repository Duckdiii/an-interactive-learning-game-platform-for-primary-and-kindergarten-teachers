/**
 * Theme Engine & World Resolver (Chặng 2.5: Asset & Theme Dressing Pipeline).
 * Tự động phân tích ngữ cảnh đề bài để gán bối cảnh thế giới game (Theme),
 * bảng màu Pastel Candy Palette, Mascot đồng hành và cấu hình hiển thị 2.5D.
 */

export type ThemeKey = 'FARM' | 'OCEAN' | 'SPACE' | 'JUNGLE' | 'FOREST' | 'CANDY'

export interface MascotConfig {
  id: 'pippy' | 'sam' | 'mimi' | 'leo' | 'rabbit' | 'penguin' | 'owl' | 'bee' | string
  name: string
  emoji: string
  avatarUrl: string
  encouragingQuote: string
  happyQuote: string
}

export interface GameThemePalette {
  background: string
  cardBg: string
  primary: string
  secondary: string
  border: string
  accent: string
  canvasBg: string
  textColor: string
  bgUrl?: string
}

export interface GameWorldTheme {
  key: ThemeKey
  name: string
  icon: string
  palette: GameThemePalette
  mascot: MascotConfig
  ambientDetails: string[]
  bgUrl?: string
}

export const GAME_WORLD_THEMES: Record<ThemeKey, GameWorldTheme> = {
  FARM: {
    key: 'FARM',
    name: 'Nông Trại Vui Vẻ',
    icon: '🌾',
    bgUrl: '/assets/themes/farm/bg-farm.svg',
    palette: {
      background: '#FFFBEB',
      cardBg: '#FFFFFF',
      primary: '#F59E0B',
      secondary: '#10B981',
      border: '#78350F',
      accent: '#EF4444',
      canvasBg: '#FFF9C4',
      textColor: '#451A03',
      bgUrl: '/assets/themes/farm/bg-farm.svg',
    },
    mascot: {
      id: 'pippy',
      name: 'Gà Con Pippy',
      emoji: '🐥',
      avatarUrl: '/assets/mascots/pippy.svg',
      encouragingQuote: 'Cố lên bạn ơi! Đếm cùng Pippy nào!',
      happyQuote: 'Chíp chíp! Bạn tính siêu quá đi thôi!',
    },
    ambientDetails: ['Đồi cỏ xanh', 'Chuồng trại đỏ', 'Mặt trời ấm áp', 'Hàng rào gỗ'],
  },
  OCEAN: {
    key: 'OCEAN',
    name: 'Đại Dương Kỳ Thú',
    icon: '🌊',
    bgUrl: '/assets/themes/ocean/bg-ocean.svg',
    palette: {
      background: '#E0F7FA',
      cardBg: '#FFFFFF',
      primary: '#0284C7',
      secondary: '#06B6D4',
      border: '#0C4A6E',
      accent: '#F59E0B',
      canvasBg: '#E0F2FE',
      textColor: '#083344',
      bgUrl: '/assets/themes/ocean/bg-ocean.svg',
    },
    mascot: {
      id: 'sam',
      name: 'Rùa Biển Sam',
      emoji: '🐢',
      avatarUrl: '/assets/mascots/sam.svg',
      encouragingQuote: 'Bơi cùng rùa Sam tìm đáp án nào!',
      happyQuote: 'Tuyệt đỉnh đại dương! Bé bơi giỏi lắm!',
    },
    ambientDetails: ['Rạn san hô', 'Bong bóng biển', 'Sao biển vàng', 'Sóng nước biếc'],
  },
  JUNGLE: {
    key: 'JUNGLE',
    name: 'Rừng Xanh Thám Hiểm',
    icon: '🌴',
    bgUrl: '/assets/themes/jungle/bg-jungle.svg',
    palette: {
      background: '#F0FDF4',
      cardBg: '#FFFFFF',
      primary: '#10B981',
      secondary: '#84CC16',
      border: '#065F46',
      accent: '#F97316',
      canvasBg: '#DCFCE7',
      textColor: '#064E3B',
      bgUrl: '/assets/themes/jungle/bg-jungle.svg',
    },
    mascot: {
      id: 'mimi',
      name: 'Mèo Cam Mimi',
      emoji: '🐱',
      avatarUrl: '/assets/mascots/mimi.svg',
      encouragingQuote: 'Cùng Mimi thám hiểm rừng xanh nhé!',
      happyQuote: 'Meo meo! Bé thật thông minh và dũng cảm!',
    },
    ambientDetails: ['Cây cổ thụ', 'Bướm rực rỡ', 'Thác nước trong vắt', 'Muông thú rộn ràng'],
  },
  SPACE: {
    key: 'SPACE',
    name: 'Du Hành Vũ Trụ',
    icon: '🚀',
    bgUrl: '/assets/themes/space/bg-space.svg',
    palette: {
      background: '#0F172A',
      cardBg: '#1E293B',
      primary: '#8B5CF6',
      secondary: '#38BDF8',
      border: '#4C1D95',
      accent: '#FACC15',
      canvasBg: '#1E1B4B',
      textColor: '#F8FAFC',
      bgUrl: '/assets/themes/space/bg-space.svg',
    },
    mascot: {
      id: 'leo',
      name: 'Bé Phi Hành Gia Leo',
      emoji: '👨‍🚀',
      avatarUrl: '/assets/mascots/leo.svg',
      encouragingQuote: 'Quan sát kỹ các vì sao cùng Leo nhé!',
      happyQuote: 'Chính xác! Cất cánh bay vào không gian thôi!',
    },
    ambientDetails: ['Hành tinh neon', 'Bụi sao lấp lánh', 'Tàu vũ trụ', 'Thiên thạch kỳ bí'],
  },
  FOREST: {
    key: 'FOREST',
    name: 'Rừng Xanh Kỳ Thú',
    icon: '🌲',
    bgUrl: '/assets/themes/jungle/bg-jungle.svg',
    palette: {
      background: '#F0FDF4',
      cardBg: '#FFFFFF',
      primary: '#10B981',
      secondary: '#84CC16',
      border: '#065F46',
      accent: '#F97316',
      canvasBg: '#DCFCE7',
      textColor: '#064E3B',
      bgUrl: '/assets/themes/jungle/bg-jungle.svg',
    },
    mascot: {
      id: 'mimi',
      name: 'Mèo Cam Mimi',
      emoji: '🐱',
      avatarUrl: '/assets/mascots/mimi.svg',
      encouragingQuote: 'Cùng Mimi thám hiểm rừng xanh nhé!',
      happyQuote: 'Meo meo! Bé thật thông minh!',
    },
    ambientDetails: ['Cây cổ thụ', 'Bướm rực rỡ', 'Nấm chấm bi', 'Hoa nở thơm'],
  },
  CANDY: {
    key: 'CANDY',
    name: 'Vương Quốc Kẹo Ngọt',
    icon: '🍭',
    bgUrl: '/assets/themes/farm/bg-farm.svg',
    palette: {
      background: '#FFF1F2',
      cardBg: '#FFFFFF',
      primary: '#F43F5E',
      secondary: '#FB7185',
      border: '#9F1239',
      accent: '#FBBF24',
      canvasBg: '#FFE4E6',
      textColor: '#881337',
      bgUrl: '/assets/themes/farm/bg-farm.svg',
    },
    mascot: {
      id: 'pippy',
      name: 'Gà Con Pippy',
      emoji: '🐥',
      avatarUrl: '/assets/mascots/pippy.svg',
      encouragingQuote: 'Kẹo ngọt thơm ngon đang chờ bé đó!',
      happyQuote: 'Xuất sắc! Thưởng cho bé một que kẹo kẹo!',
    },
    ambientDetails: ['Kẹo mút khổng lồ', 'Bánh gừng', 'Kẹo dẻo gấu', 'Cầu vồng đường'],
  },
}

const THEME_KEYWORDS: Record<ThemeKey, string[]> = {
  FARM: [
    'nong trai', 'trang trai', 'ga', 'vit', 'bo', 'cuu', 'ca rot', 'heo', 'lon',
    'dong vat', 'dong co', 'nong dan', 'bac nong dan', 'farm', 'chuong', 'thoc', 'tao', 'cam', 'chuoi'
  ],
  OCEAN: [
    'dai duong', 'bien', 'ca', 'cua', 'sao bien', 'bach tuoc', 'song', 'thuy cung',
    'ocean', 'sea', 'san ho', 'tau ngam', 'thuy quan', 'nuoc', 'ca heo', 'rua bien', 'ca he'
  ],
  JUNGLE: [
    'rung', 'cay', 'hoa', 'chim', 'la', 'khi', 'soc', 'nui', 'thien nhien',
    'forest', 'khu rung', 'dong vat hoang da', 'su tu', 'ho', 'jungle', 'huou cao co', 'voi'
  ],
  SPACE: [
    'vu tru', 'hanh tinh', 'phi thuyen', 'ban cung', 'ten lua', 'sao', 'thien ha',
    'bong bay', 'space', 'archery', 'sling', 'na cao su', 'ban ten', 'phong ten', 'alien', 'ufo'
  ],
  FOREST: [
    'rung cay', 'cay coi', 'nhiet doi'
  ],
  CANDY: [
    'keo', 'banh', 'ngot', 'mau sac', 'keo mut', 'candy', 'sweet', 'socola',
    'kem'
  ],
}

/**
 * Chuẩn hóa xâu chữ không dấu
 */
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
}

/**
 * Tự động suy luận Theme dựa trên văn bản prompt, môn học hoặc ghi đè trực tiếp từ người dùng
 */
export function resolveGameTheme(prompt: string, subject?: string, themeOverride?: string): GameWorldTheme {
  if (themeOverride && themeOverride.toUpperCase() !== 'AUTO') {
    const normalizedKey = themeOverride.toUpperCase() as ThemeKey
    if (GAME_WORLD_THEMES[normalizedKey]) {
      return GAME_WORLD_THEMES[normalizedKey]
    }
  }

  const normalized = normalizeText(prompt)

  // 1. Quét và tính điểm từ khóa khớp theo ranh giới từ (tránh false-positive substring như 'cac' -> 'ca')
  let bestTheme: ThemeKey = 'FARM'
  let bestScore = 0

  for (const [key, keywords] of Object.entries(THEME_KEYWORDS) as [ThemeKey, string[]][]) {
    let score = 0
    for (const kw of keywords) {
      const normKw = normalizeText(kw)
      const regex = new RegExp(`(^|\\s|[.,!?;])${normKw}(\\s|[.,!?;]|$)`, 'i')
      if (regex.test(normalized)) {
        score += normKw.includes(' ') ? 5 : 2
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestTheme = key
    }
  }

  if (bestScore > 0) {
    return GAME_WORLD_THEMES[bestTheme]
  }

  // 2. Fallback theo môn học
  if (subject === 'Science') {
    return GAME_WORLD_THEMES.FOREST
  }
  if (subject === 'Vietnamese') {
    return GAME_WORLD_THEMES.CANDY
  }

  // Mặc định Toán / Mầm non là FARM thân thuộc nhất
  return GAME_WORLD_THEMES.FARM
}
