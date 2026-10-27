import { useContext } from 'react'
import { GamePaletteContextObject } from './gamePaletteContext'

/** Màu cho phần vẽ bằng Konva (không đọc được biến CSS). Phía học sinh bảng màu đến từ `profile.tokens.colors`. */
export const useGamePalette = () => useContext(GamePaletteContextObject)
