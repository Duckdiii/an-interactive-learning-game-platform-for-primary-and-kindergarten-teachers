import { useContext } from 'react'
import { UiProfileContextObject } from './uiProfileContextObject'

export function useUiProfile() {
  const profile = useContext(UiProfileContextObject)

  if (!profile) throw new Error('useUiProfile must be used within a UiProfileProvider')

  return profile
}
