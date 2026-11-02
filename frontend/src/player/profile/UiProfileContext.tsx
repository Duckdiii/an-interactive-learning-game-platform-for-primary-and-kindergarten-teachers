import type { ReactNode } from 'react'
import { GamePaletteProvider } from '../../games/common/GamePaletteProvider'
import { UiProfileContextObject } from './uiProfileContextObject'
import type { UiProfile } from './types'

export function UiProfileProvider({ profile, children }: { profile: UiProfile; children: ReactNode }) {
  // Konva không đọc được biến CSS nên màu đi qua context này; DOM dùng biến CSS do usePlayerRootStyle đặt.
  return (
    <UiProfileContextObject.Provider value={profile}>
      <GamePaletteProvider palette={profile.tokens.colors}>{children}</GamePaletteProvider>
    </UiProfileContextObject.Provider>
  )
}
