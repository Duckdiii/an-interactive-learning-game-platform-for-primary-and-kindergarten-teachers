import { mockMatchingQuestion } from '../../games/matching/MatchingRenderer.fixtures'
import { mockQuizQuestion } from '../../games/quiz/QuizRenderer.fixtures'
import type { AgeBand } from '../theme/themeTypes'
import { ALL_THEMES } from '../theme/themes'
import { AGE_BAND_ORDER, AGE_PROFILES } from './ageProfiles'
import { matchingFacts, quizFacts } from './rendererFacts'
import { validateAgainstProfile, type ProfileIssue } from './validateAgainstProfile'

/** Chiều rộng khung chứa dùng để xét: điện thoại, máy tính bảng, máy tính (coi sân chiếm trọn khung: LẠC QUAN, bỏ qua lề trang). */
export const MATRIX_CONTAINER_WIDTHS = [390, 768, 1280] as const

export interface GameCell {
  mechanic: 'QUIZ' | 'MATCHING'
  containerWidth: number
  band: AgeBand
  issues: ProfileIssue[]
}

export interface ThemeCell {
  themeId: string
  mechanic: 'QUIZ' | 'MATCHING'
  band: AgeBand
  issues: ProfileIssue[]
}

/** Kết quả kiểm màn QUIZ và MATCHING (dữ liệu mẫu) theo từng nhóm tuổi và chiều rộng khung. */
export function gameMatrix(widths: readonly number[] = MATRIX_CONTAINER_WIDTHS): GameCell[] {
  const cells: GameCell[] = []
  for (const containerWidth of widths) {
    for (const band of AGE_BAND_ORDER) {
      const profile = AGE_PROFILES[band]
      cells.push({
        mechanic: 'QUIZ',
        containerWidth,
        band,
        issues: validateAgainstProfile({ kind: 'game', facts: quizFacts(mockQuizQuestion, containerWidth) }, profile),
      })
      cells.push({
        mechanic: 'MATCHING',
        containerWidth,
        band,
        issues: validateAgainstProfile({ kind: 'game', facts: matchingFacts(mockMatchingQuestion, containerWidth) }, profile),
      })
    }
  }
  return cells
}

/** Kết quả kiểm từng theme theo nhóm tuổi và cơ chế. */
export function themeMatrix(): ThemeCell[] {
  const cells: ThemeCell[] = []
  for (const theme of ALL_THEMES) {
    for (const mechanic of ['QUIZ', 'MATCHING'] as const) {
      for (const band of AGE_BAND_ORDER) {
        cells.push({
          themeId: theme.id,
          mechanic,
          band,
          issues: validateAgainstProfile({ kind: 'theme', theme, mechanic }, AGE_PROFILES[band]),
        })
      }
    }
  }
  return cells
}
