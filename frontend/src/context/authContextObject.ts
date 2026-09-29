import { createContext } from 'react'
import type { AuthContextValue } from '../types/auth'

export const AuthContextObject = createContext<AuthContextValue | undefined>(
  undefined,
)
