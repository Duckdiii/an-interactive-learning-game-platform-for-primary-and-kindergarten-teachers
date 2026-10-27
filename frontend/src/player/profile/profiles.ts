import { DEFAULT_PALETTE } from '../../games/common/palette'
import type { AgeBand, UiProfile } from './types'

export const PROFILES: Readonly<Record<AgeBand, UiProfile>> = {
  be: {
    band: 'be',
    tokens: { fontScale: 1.25, minTouch: 64, decoration: true, colors: DEFAULT_PALETTE },
    interaction: { tapToSubmit: true, hintAfterMs: 8000, timer: false },
    audio: { autoReadPrompt: true },
    feedback: 'garden',
  },
  hocSinh: {
    band: 'hocSinh',
    tokens: { fontScale: 1, minTouch: 48, decoration: false, colors: DEFAULT_PALETTE },
    interaction: { tapToSubmit: false, hintAfterMs: null, timer: true },
    audio: { autoReadPrompt: false },
    feedback: 'score',
  },
}
