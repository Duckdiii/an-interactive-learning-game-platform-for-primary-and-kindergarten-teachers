import { screen } from '@testing-library/react'
import { AUTOSAVE_DELAY_MS } from '../hooks/useGameEditor'

// Tự lưu chạy sau AUTOSAVE_DELAY_MS kể từ lần sửa cuối: chờ nhãn "Đã tự lưu" quay lại sau một lần sửa (gọi SAU khi đã sửa).
export const AUTOSAVE_WAIT = { timeout: AUTOSAVE_DELAY_MS + 4000 }
export const autosaved = () => screen.findByText('Đã tự lưu', {}, AUTOSAVE_WAIT)
