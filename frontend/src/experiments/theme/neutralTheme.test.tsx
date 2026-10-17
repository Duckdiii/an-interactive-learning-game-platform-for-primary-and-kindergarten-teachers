import { renderHook } from '@testing-library/react'
import konvaTextSource from 'konva/lib/shapes/Text.js?raw'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import ThemeProvider from './ThemeProvider'
import { neutralTheme } from './themes/neutral'
import { MIN_LINK_COLORS, type ThemeManifest } from './themeTypes'
import { useTheme } from './useTheme'
import { validateTheme } from './validateTheme'

// Mã nguồn của các renderer hiện có (không gồm test, fixture). `?raw` để đọc chữ thật của file.
const rendererSources = import.meta.glob(['../../games/**/*.tsx', '../../games/**/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const productionSources = Object.entries(rendererSources).filter(([path]) => !/\.(test|fixtures)\./.test(path))

describe('theme neutral', () => {
  it('hợp lệ theo validateTheme', () => {
    expect(validateTheme(neutralTheme)).toEqual([])
  })

  it('ghim các giá trị lấy từ renderer hiện tại (mốc so sánh cho theme khác)', () => {
    expect(neutralTheme.colors).toEqual({
      background: '#FFFFFF',
      onBackground: '#000000',
      surface: '#FFFFFF',
      surfaceSelected: '#DBEAFE',
      surfaceCorrect: '#A5D6A7',
      surfaceTryAgain: '#FFE082',
      text: '#000000',
      border: '#334155',
      accent: '#2563EB',
      accentBorder: '#1E40AF',
      onAccent: '#FFFFFF',
      disabledSurface: '#E2E8F0',
      disabledBorder: '#CBD5E1',
      onDisabled: '#94A3B8',
      audioSurface: '#E0F2FE',
      audioBorder: '#0284C7',
      lineCorrect: '#43A047',
      lineTryAgain: '#F59E0B',
      linkColors: ['#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#92400E', '#64748B'],
    })
    expect(neutralTheme.font).toEqual({ family: 'Arial', baseSize: 26 })
    expect(neutralTheme.paintStageBackground).toBe(false)
  })

  it('đủ số màu đường nối cho MATCHING tối đa 6 cặp', () => {
    expect(neutralTheme.colors.linkColors.length).toBeGreaterThanOrEqual(MIN_LINK_COLORS)
  })

  it('tìm thấy mã nguồn renderer để so (không quét rỗng)', () => {
    expect(productionSources.length).toBeGreaterThan(5)
    expect(productionSources.some(([path]) => path.endsWith('MatchingCard.tsx'))).toBe(true)
  })

  it('mọi màu #RRGGBB viết cứng trong renderer đều có trong theme neutral (không sót màu)', () => {
    const themeColors = new Set([...Object.values(neutralTheme.colors).flat()].map((color) => color.toUpperCase()))
    const missing: string[] = []
    for (const [path, source] of productionSources) {
      for (const match of source.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
        if (!themeColors.has(match[0].toUpperCase())) missing.push(`${path}: ${match[0]}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('renderer không dùng dạng màu mà phép quét #RRGGBB bỏ qua (#RGB, #RRGGBBAA, rgb(), hsl(), tên màu)', () => {
    const unsupported: string[] = []
    for (const [path, source] of productionSources) {
      const hexOther = [...source.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].filter((m) => m[0].length !== 7)
      const functional = [...source.matchAll(/\b(?:rgba?|hsla?)\(/g)]
      const named = [...source.matchAll(/\b(?:fill|stroke)\s*=\s*["']([A-Za-z]+)["']/g)]
      for (const m of [...hexOther, ...functional, ...named]) unsupported.push(`${path}: ${m[0]}`)
    }
    expect(unsupported).toEqual([])
  })

  it('text và họ phông của neutral trùng mặc định thật của Konva (renderer không đặt riêng)', () => {
    // jsdom không có canvas nên không dựng được `new Konva.Text()`; đọc khai báo mặc định trong mã nguồn Konva.
    // Nâng cấp Konva mà đổi mặc định thì test này đỏ (và theme neutral hết "đúng giao diện hiện tại").
    expect(konvaTextSource).toContain(`addGetterSetter(Text, 'fontFamily', '${neutralTheme.font.family}')`)
    expect(konvaTextSource).toContain("{ ...config, fill: 'black' }")
    expect(neutralTheme.colors.text).toBe('#000000')
  })
})

describe('ThemeProvider và useTheme', () => {
  it('không có provider thì trả theme neutral', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current).toBe(neutralTheme)
  })

  it('có provider thì trả đúng theme được cấp, kể cả lồng nhau (trong cùng thắng)', () => {
    const outer: ThemeManifest = { ...neutralTheme, id: 'outer', name: 'Ngoài' }
    const inner: ThemeManifest = { ...neutralTheme, id: 'inner', name: 'Trong' }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider theme={outer}>
        <ThemeProvider theme={inner}>{children}</ThemeProvider>
      </ThemeProvider>
    )
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current.id).toBe('inner')
  })
})
