import { render, renderHook, screen } from '@testing-library/react'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_PALETTE, paletteCssVars } from '../../games/common/palette'
import { useGamePalette } from '../../games/common/useGamePalette'
import PlayButton from '../components/PlayButton'
import { PROFILES } from '../profile/profiles'
import { UiProfileProvider } from '../profile/UiProfileContext'
import { playerRootVars } from './playerRootVars'
import { usePlayerRootStyle } from './usePlayerRootStyle'

const SRC = join(__dirname, '..', '..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)

    return statSync(path).isDirectory() ? sourceFiles(path) : [path]
  })
}

const isTest = (path: string) => /\.(test|fixtures)\./.test(path)

describe('không viết cứng màu', () => {
  it('src/player và src/games (trừ test, fixture và bảng màu) không có mã màu hex', () => {
    const offenders = [...sourceFiles(join(SRC, 'player')), ...sourceFiles(join(SRC, 'games'))]
      .filter((path) => /\.(ts|tsx)$/.test(path) && !isTest(path) && !path.endsWith('palette.ts') && !path.endsWith('themes.ts'))
      .filter((path) => /#[0-9A-Fa-f]{3,8}\b|\brgba?\(|\bhsla?\(/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path))

    expect(offenders).toEqual([])
  })

  it('không còn dùng màu của trang giáo viên (paper, ink, brand, sun) trong src/player', () => {
    const offenders = sourceFiles(join(SRC, 'player'))
      .filter((path) => path.endsWith('.tsx') && !isTest(path))
      .filter((path) => /\b(bg-paper|text-ink|text-sun|bg-brand|text-brand)\b/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path))

    expect(offenders).toEqual([])
  })

  it('mọi màu play-* của Tailwind trỏ tới một biến --play-* có thật trong bảng màu', () => {
    const css = readFileSync(join(SRC, 'index.css'), 'utf8')
    const vars = new Set(Object.keys(paletteCssVars(DEFAULT_PALETTE)))
    const used = [...css.matchAll(/--color-play-[a-z-]+:\s*var\((--play-[a-z-]+)\)/g)].map((m) => m[1])

    expect(used.length).toBeGreaterThan(0)
    for (const name of used) expect(vars.has(name), name).toBe(true)
  })
})

describe('paletteCssVars', () => {
  it('đổi tên camelCase sang kebab-case và bỏ màu danh sách (linkColors)', () => {
    const vars = paletteCssVars(DEFAULT_PALETTE)

    expect(vars['--play-ink-soft']).toBe(DEFAULT_PALETTE.inkSoft)
    expect(vars['--play-primary-strong']).toBe(DEFAULT_PALETTE.primaryStrong)
    expect(Object.keys(vars).some((name) => name.includes('link'))).toBe(false)
  })
})

describe('token theo profile', () => {
  it('khung Bé có vùng chạm 64px và cỡ chữ lớn hơn khung Học sinh', () => {
    expect(playerRootVars(PROFILES.be).vars['--play-min-touch']).toBe('64px')
    expect(playerRootVars(PROFILES.be).fontSize).toBe('125%')
    expect(playerRootVars(PROFILES.hocSinh).vars['--play-min-touch']).toBe('48px')
    expect(playerRootVars(PROFILES.hocSinh).fontSize).toBe('100%')
  })

  it('usePlayerRootStyle đặt biến lên thẻ gốc và trả lại giá trị cũ khi rời trang', () => {
    const root = document.documentElement
    root.style.fontSize = '90%'
    root.style.setProperty('--play-page', 'old')

    const { unmount } = renderHook(() => usePlayerRootStyle(PROFILES.be))

    expect(root.style.getPropertyValue('--play-primary')).toBe(DEFAULT_PALETTE.primary)
    expect(root.style.getPropertyValue('--play-min-touch')).toBe('64px')
    expect(root.style.fontSize).toBe('125%')

    unmount()

    expect(root.style.getPropertyValue('--play-page')).toBe('old')
    expect(root.style.getPropertyValue('--play-primary')).toBe('')
    expect(root.style.fontSize).toBe('90%')
    root.style.removeProperty('--play-page')
    root.style.fontSize = ''
  })

  it('đổi khung thì token đổi theo và không để sót giá trị của khung trước', () => {
    const root = document.documentElement
    const { rerender, unmount } = renderHook(({ profile }) => usePlayerRootStyle(profile), { initialProps: { profile: PROFILES.be } })

    rerender({ profile: PROFILES.hocSinh })
    expect(root.style.getPropertyValue('--play-min-touch')).toBe('48px')
    expect(root.style.fontSize).toBe('100%')
    unmount()
  })
})

describe('Konva đọc màu từ profile', () => {
  it('bảng màu của profile đến được useGamePalette qua UiProfileProvider; ngoài provider dùng mặc định', () => {
    const custom = { ...PROFILES.be, tokens: { ...PROFILES.be.tokens, colors: { ...DEFAULT_PALETTE, primary: '#123456' } } }
    const inside = renderHook(() => useGamePalette(), { wrapper: ({ children }) => <UiProfileProvider profile={custom}>{children}</UiProfileProvider> })
    const outside = renderHook(() => useGamePalette())

    expect(inside.result.current.primary).toBe('#123456')
    expect(outside.result.current.primary).toBe(DEFAULT_PALETTE.primary)
  })
})

describe('PlayButton', () => {
  it('lấy vùng chạm và màu từ token (biến CSS), không viết cứng', () => {
    render(<PlayButton>Bắt đầu</PlayButton>)
    const button = screen.getByRole('button', { name: 'Bắt đầu' })

    expect(button.className).toContain('min-h-[var(--play-min-touch)]')
    expect(button.className).toContain('bg-play-primary')
  })
})
