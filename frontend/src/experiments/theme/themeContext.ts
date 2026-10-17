import { createContext } from 'react'
import { neutralTheme } from './themes/neutral'
import type { ThemeManifest } from './themeTypes'

/** Mặc định là `neutral`: không có provider thì renderer giữ nguyên giao diện hiện tại. */
export const ThemeContext = createContext<ThemeManifest>(neutralTheme)
