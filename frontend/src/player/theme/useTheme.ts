import { useContext } from 'react'
import { ThemeContextObject } from './themeContextObject'

export const useTheme = () => useContext(ThemeContextObject)
