import { createContext } from 'react'
import { DEFAULT_PALETTE } from './palette'
import type { Palette } from './palette'

// Ngoài GamePaletteProvider (ví dụ renderer ở trang giáo viên) dùng bảng màu mặc định nên bố cục không đổi.
export const GamePaletteContextObject = createContext<Palette>(DEFAULT_PALETTE)
