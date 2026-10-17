import { useContext } from 'react'
import { ThemeContext } from './themeContext'
import type { ThemeManifest } from './themeTypes'

export function useTheme(): ThemeManifest {
  return useContext(ThemeContext)
}
