import type { ReactNode } from 'react'
import { ThemeContext } from './themeContext'
import type { ThemeManifest } from './themeTypes'

interface ThemeProviderProps {
  theme: ThemeManifest
  children: ReactNode
}

/** Cấp theme cho các renderer bên dưới. Không tự kiểm `validateTheme`: người gọi chịu trách nhiệm. */
export default function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}
