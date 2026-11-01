import { createContext } from 'react'
import type { UiProfile } from './types'

export const UiProfileContextObject = createContext<UiProfile | undefined>(undefined)
