import { paletteCssVars } from '../../games/common/palette'
import type { UiProfile } from '../profile/types'

/** Biến CSS của phần chơi suy ra từ profile: các màu `--play-*`, vùng chạm tối thiểu và hệ số cỡ chữ (nhân với cỡ chữ gốc của trang). */
export function playerRootVars({ tokens }: UiProfile): { vars: Record<string, string>; fontSize: string } {
  return {
    vars: { ...paletteCssVars(tokens.colors), '--play-min-touch': `${tokens.minTouch}px` },
    fontSize: `${tokens.fontScale * 100}%`,
  }
}
