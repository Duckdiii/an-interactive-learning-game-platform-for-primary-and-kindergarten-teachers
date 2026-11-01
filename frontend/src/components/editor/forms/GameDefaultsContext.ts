import { createContext, useContext } from 'react'

// Thời gian/điểm mặc định của game (suy ra từ các câu, xem utils/gameDefaults) cho form của từng câu; vắng là chưa có câu nào.
export interface GameDefaults {
  timeLimitSeconds?: number
  points?: number
}

export const GameDefaultsContext = createContext<GameDefaults>({})

export const useGameDefaults = () => useContext(GameDefaultsContext)
