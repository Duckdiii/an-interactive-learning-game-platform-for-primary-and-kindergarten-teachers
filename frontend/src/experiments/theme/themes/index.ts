import type { ThemeManifest } from '../themeTypes'
import { neutralTheme } from './neutral'
import { oceanTheme } from './ocean'
import { spaceTheme } from './space'

/** Mọi theme của khu thử nghiệm; `neutral` đứng đầu làm mốc so sánh. */
export const ALL_THEMES: readonly ThemeManifest[] = [neutralTheme, spaceTheme, oceanTheme]

export function findTheme(id: string): ThemeManifest | undefined {
  return ALL_THEMES.find((theme) => theme.id === id)
}
