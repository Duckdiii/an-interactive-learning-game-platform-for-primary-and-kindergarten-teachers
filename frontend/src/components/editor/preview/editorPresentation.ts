import { resolveTheme } from '../../../player/theme/resolveTheme'
import type { GamePresentation, GameType } from '../../../types/game-dsl.types'
import { resolvePresentation } from '../../../utils/presentation'

/**
 * Thế giới và cách trình bày của game đang soạn, chọn giống hệt màn chơi thử (PlayTestPanel): dùng cho xem trước và cho các
 * phần trong form vẽ đúng thứ bé sẽ thấy (ví dụ mặt úp thẻ Lật thẻ).
 */
export function editorPresentation(input: {
  presentation?: GamePresentation
  subject: string
  gameType: GameType
  topic?: string
  seed: string
}) {
  const theme = resolveTheme({ themeId: input.presentation?.world, subject: input.subject, gameType: input.gameType, topic: input.topic })
  return { theme, presentation: resolvePresentation(input.presentation, theme.id, input.seed) }
}
