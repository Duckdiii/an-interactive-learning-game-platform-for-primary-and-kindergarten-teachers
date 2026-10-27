import type { ReactNode } from 'react'
import { GamePaletteContextObject } from './gamePaletteContext'
import type { Palette } from './palette'

export function GamePaletteProvider({ palette, children }: { palette: Palette; children: ReactNode }) {
  return <GamePaletteContextObject.Provider value={palette}>{children}</GamePaletteContextObject.Provider>
}
