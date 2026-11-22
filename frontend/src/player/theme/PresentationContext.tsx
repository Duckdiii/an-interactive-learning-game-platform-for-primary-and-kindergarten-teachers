import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { ResolvedPresentation } from '../../utils/presentation'

// Vật mang đáp án và bố cục của game đang chơi; null khi chưa có nơi nào cung cấp (renderer tự dùng mặc định theo thế giới).
const PresentationContextObject = createContext<ResolvedPresentation | null>(null)

export function PresentationProvider({ presentation, children }: { presentation: ResolvedPresentation; children: ReactNode }) {
  return <PresentationContextObject.Provider value={presentation}>{children}</PresentationContextObject.Provider>
}

export const usePresentation = () => useContext(PresentationContextObject)
