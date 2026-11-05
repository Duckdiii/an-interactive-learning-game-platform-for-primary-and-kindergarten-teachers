import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GAME_TYPES, SUBJECTS } from '../../types/game-dsl.types'
import type { AnswerResult } from '../../types/game-student.types'
import Mascot from './Mascot'
import { mascotStateFor } from './mascotState'
import { matchThemeRule, resolveTheme } from './resolveTheme'
import { ThemeProvider } from './ThemeContext'
import { DEFAULT_THEME, PLATFORM_MASCOT, THEME_RULES, THEMES } from './themes'
import type { ThemeRule } from './themes'
import { MASCOT_STATES } from './types'

describe('resolveTheme', () => {
  it('mặc định theo môn', () => {
    expect(resolveTheme({ subject: 'MATH' }).id).toBe('bee')
    expect(resolveTheme({ subject: 'VIETNAMESE' }).id).toBe('rabbit')
    expect(resolveTheme({ subject: 'ENGLISH' }).id).toBe('owl')
  })

  it('mọi luật trỏ tới một theme có thật (gõ sai id thì lặng lẽ rơi về mặc định)', () => {
    for (const rule of THEME_RULES) expect(THEMES.has(rule.themeId), rule.themeId).toBe(true)
  })

  it('mọi cặp loại game x môn của DSL đều ra một theme có thật', () => {
    for (const gameType of GAME_TYPES) for (const subject of SUBJECTS) expect(THEMES.has(resolveTheme({ gameType, subject }).id)).toBe(true)
  })

  it('thiếu hoặc lạ: dùng theme mặc định', () => {
    expect(resolveTheme({})).toBe(DEFAULT_THEME)
    expect(resolveTheme({ subject: 'KHONG_CO', gameType: 'QUIZ' })).toBe(DEFAULT_THEME)
  })

  it('giáo viên chọn theme thì thắng luật theo môn; theme không tồn tại bị bỏ qua', () => {
    expect(resolveTheme({ themeId: 'owl', subject: 'MATH' }).id).toBe('owl')
    expect(resolveTheme({ themeId: 'khong-co', subject: 'MATH' }).id).toBe('bee')
    expect(resolveTheme({ themeId: 'constructor', subject: 'MATH' }).id).toBe('bee')
  })

  it('tự động bóc tách ngữ nghĩa từ topic khi không chỉ định themeId', () => {
    expect(resolveTheme({ topic: 'Bé nối các sinh vật biển: cá hề, rùa biển' }).id).toBe('ocean')
    expect(resolveTheme({ topic: 'Đếm các con vật trong nông trại: gà, bò, cừu' }).id).toBe('farm')
    expect(resolveTheme({ topic: 'Khám phá vũ trụ và các hành tinh' }).id).toBe('space')
  })

  it('luật nêu cả loại game lẫn môn thì cả hai phải khớp, và luật đặt trước thắng', () => {
    const rules: ThemeRule[] = [{ gameType: 'MEMORY_CARD', subject: 'MATH', themeId: 'owl' }, ...THEME_RULES]

    expect(matchThemeRule(rules, { gameType: 'MEMORY_CARD', subject: 'MATH' })).toBe('owl')
    expect(matchThemeRule(rules, { gameType: 'QUIZ', subject: 'MATH' })).toBe('bee')
    expect(matchThemeRule(rules, { gameType: 'MEMORY_CARD', subject: 'ENGLISH' })).toBe('owl')
    expect(matchThemeRule([{ gameType: 'MEMORY_CARD', themeId: 'rabbit' }], { gameType: 'QUIZ' })).toBeUndefined()
  })

  it('mọi theme đều có biểu tượng tiến độ', () => {
    for (const theme of THEMES.values()) {
      expect(theme.progress.filled).not.toBe('')
      expect(theme.progress.empty).not.toBe('')
    }
  })
})

describe('mascotStateFor', () => {
  const result = (status: AnswerResult['status']): AnswerResult => ({ status, isCorrect: status === 'CORRECT', pointsEarned: 0, totalScore: 0, correctAnswer: null })

  it('chưa trả lời: hỏi; đúng: vui; sai, hết giờ, bỏ qua: an ủi (không bao giờ buồn hay chê)', () => {
    expect(mascotStateFor(null)).toBe('ask')
    expect(mascotStateFor(result('CORRECT'))).toBe('happy')
    for (const status of ['INCORRECT', 'TIMEOUT', 'SKIPPED'] as const) expect(mascotStateFor(result(status))).toBe('comfort')
  })
})

describe('Mascot', () => {
  it('có đủ 6 trạng thái, mỗi trạng thái một nhãn đọc được', () => {
    for (const state of MASCOT_STATES) {
      const { unmount } = render(<Mascot state={state} />)

      expect(screen.getByRole('img')).toHaveAttribute('data-mascot-state', state)
      expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^Nhân vật/)
      unmount()
    }
  })

  it('theme chưa có nhân vật thì dùng biểu tượng nền tảng; theme có nhân vật thì dùng nhân vật', () => {
    const { unmount } = render(<Mascot state="greet" />)

    expect(screen.getByRole('img')).toHaveTextContent(PLATFORM_MASCOT)
    unmount()

    render(
      <ThemeProvider theme={THEMES.get('bee')!}>
        <Mascot state="happy" />
      </ThemeProvider>,
    )
    expect(screen.getByRole('img')).toHaveTextContent('🐝')
  })
})
