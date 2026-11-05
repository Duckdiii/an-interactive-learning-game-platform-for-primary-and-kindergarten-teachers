import { detectExplicitTheme } from '../../utils/assetResolver'
import { DEFAULT_THEME, THEME_RULES, THEMES } from './themes'
import type { ThemeRule } from './themes'
import type { Theme } from './types'

export interface ThemeInput {
  /** Giáo viên chọn khi xuất bản (lưu ở thông tin xuất bản, không nằm trong JSON game). */
  themeId?: string | null
  gameType?: string | null
  subject?: string | null
  /** Chủ đề hoặc nội dung bài học để AI tự suy luận thế giới game. */
  topic?: string | null
}

/** Id theme của luật đầu tiên khớp (luật khớp khi mọi trường nó nêu đều khớp); tách ra để kiểm thứ tự ưu tiên bằng luật giả. */
export function matchThemeRule(rules: readonly ThemeRule[], { gameType, subject }: ThemeInput): string | undefined {
  return rules.find((rule) => (!rule.gameType || rule.gameType === gameType) && (!rule.subject || rule.subject === subject))?.themeId
}

/** Giáo viên chọn (nếu theme có thật) rồi đến suy luận từ chủ đề/đề bài, rồi luật theo loại game và môn, rồi mặc định. Hàm thuần. */
export function resolveTheme(input: ThemeInput): Theme {
  const chosen = input.themeId ? THEMES.get(input.themeId) : undefined

  if (chosen) return chosen

  // Chỉ tự động suy luận theme khi bài học có từ khóa chủ đề rõ ràng (đại dương, nông trại, vũ trụ, rừng xanh)
  if (input.topic) {
    const explicit = detectExplicitTheme(input.topic)
    if (explicit) {
      const found = THEMES.get(explicit)
      if (found) return found
    }
  }

  const ruled = matchThemeRule(THEME_RULES, input)

  return (ruled && THEMES.get(ruled)) || DEFAULT_THEME
}
