import { createContext, useContext } from 'react'
import type { VoiceGender } from '../../../services/mediaService'

// Giọng đọc đang chọn (FLD-12, mặc định nữ). Chỉ là lựa chọn của giao diện cho các lần tạo giọng đọc trong phiên soạn này: schema DSL
// không có trường giọng đọc nên không lưu vào game (xem docs/decisions.md).
export interface VoicePreference {
  voice: VoiceGender
  setVoice: (voice: VoiceGender) => void
}

export const VoiceContext = createContext<VoicePreference>({ voice: 'FEMALE', setVoice: () => {} })

export const useVoicePreference = () => useContext(VoiceContext)
