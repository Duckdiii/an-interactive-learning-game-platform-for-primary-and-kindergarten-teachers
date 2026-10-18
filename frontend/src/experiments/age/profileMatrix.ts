import { mockMatchingQuestion } from '../../games/matching/MatchingRenderer.fixtures'
import { mockQuizQuestion } from '../../games/quiz/QuizRenderer.fixtures'
import { mockNumberLine10 } from '../games/numberLine/numberLineFixtures'
import { numberLineFacts } from '../games/numberLine/numberLineFacts'
import { mockPrepositionUnder } from '../games/prepositionScene/prepositionFixtures'
import { prepositionFacts } from '../games/prepositionScene/prepositionFacts'
import { mockSyllableMeo } from '../games/syllableBuilder/syllableFixtures'
import { syllableFacts } from '../games/syllableBuilder/syllableFacts'
import type { AgeBand } from '../theme/themeTypes'
import { ALL_THEMES } from '../theme/themes'
import { AGE_BAND_ORDER, AGE_PROFILES } from './ageProfiles'
import { matchingFacts, quizFacts } from './rendererFacts'
import { validateAgainstProfile, type GameFacts, type ProfileIssue } from './validateAgainstProfile'

/** Chiều rộng khung chứa dùng để xét: điện thoại, máy tính bảng, máy tính (coi sân chiếm trọn khung: LẠC QUAN, bỏ qua lề trang). */
export const MATRIX_CONTAINER_WIDTHS = [390, 768, 1280] as const

export type MatrixMechanic = 'QUIZ' | 'MATCHING' | 'NUMBER_LINE' | 'SYLLABLE_BUILDER' | 'PREPOSITION_SCENE'

/** Hai renderer sản phẩm hiện có; kết quả của chúng được ghim trong test nên mặc định không đổi khi thêm loại thử nghiệm. */
export const PRODUCT_MECHANICS: readonly MatrixMechanic[] = ['QUIZ', 'MATCHING']
/** Gồm cả loại thử nghiệm (T4.x). */
export const ALL_MECHANICS: readonly MatrixMechanic[] = ['QUIZ', 'MATCHING', 'NUMBER_LINE', 'SYLLABLE_BUILDER', 'PREPOSITION_SCENE']

const FACTS: Record<MatrixMechanic, (containerWidth: number) => GameFacts> = {
  QUIZ: (w) => quizFacts(mockQuizQuestion, w),
  MATCHING: (w) => matchingFacts(mockMatchingQuestion, w),
  NUMBER_LINE: (w) => numberLineFacts(mockNumberLine10, w),
  SYLLABLE_BUILDER: (w) => syllableFacts(mockSyllableMeo, w),
  PREPOSITION_SCENE: (w) => prepositionFacts(mockPrepositionUnder, w),
}

export interface GameCell {
  mechanic: MatrixMechanic
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

/** Kết quả kiểm các màn mẫu theo từng nhóm tuổi và chiều rộng khung. */
export function gameMatrix(
  widths: readonly number[] = MATRIX_CONTAINER_WIDTHS,
  mechanics: readonly MatrixMechanic[] = PRODUCT_MECHANICS,
): GameCell[] {
  const cells: GameCell[] = []
  for (const containerWidth of widths) {
    for (const band of AGE_BAND_ORDER) {
      for (const mechanic of mechanics) {
        cells.push({
          mechanic,
          containerWidth,
          band,
          issues: validateAgainstProfile({ kind: 'game', facts: FACTS[mechanic](containerWidth) }, AGE_PROFILES[band]),
        })
      }
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
