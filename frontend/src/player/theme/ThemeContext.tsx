import type { ReactNode } from 'react'
import { ThemeContextObject } from './themeContextObject'
import type { Theme } from './types'

export function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ThemeContextObject.Provider value={theme}>{children}</ThemeContextObject.Provider>
}
