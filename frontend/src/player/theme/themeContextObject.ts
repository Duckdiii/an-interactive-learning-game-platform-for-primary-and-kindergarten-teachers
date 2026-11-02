import { createContext } from 'react'
import { DEFAULT_THEME } from './themes'
import type { Theme } from './types'

// Ngoài ThemeProvider dùng theme mặc định (không báo lỗi) để khung dựng riêng lẻ vẫn chạy.
export const ThemeContextObject = createContext<Theme>(DEFAULT_THEME)
