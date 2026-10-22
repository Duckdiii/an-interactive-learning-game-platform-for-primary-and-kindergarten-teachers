import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FONT_SAMPLE_TEXT, fontStack, useFontReady } from './useFontReady'

const setFonts = (load: unknown) => Object.defineProperty(document, 'fonts', { configurable: true, value: load === undefined ? undefined : { load } })
afterEach(() => setFonts(undefined))

describe('fontStack', () => {
  it('font tùy chỉnh: chỉ vào danh sách khi đã nạp xong, luôn có Arial dự phòng', () => {
    expect(fontStack('Nunito', true)).toBe('"Nunito", Arial, sans-serif')
    expect(fontStack('Nunito', false)).toBe('Arial, sans-serif')
  })
  it('font hệ thống hoặc rỗng: luôn Arial', () => {
    for (const family of ['Arial', 'arial', 'Inter', '', '   ', 'sans-serif']) expect(fontStack(family, true)).toBe('Arial, sans-serif')
  })
  it('bỏ dấu nháy và gạch chéo để không chèn được CSS lạ', () => {
    expect(fontStack('Nu"nito\\;', true)).toBe('"Nunito;", Arial, sans-serif')
  })
})

describe('useFontReady', () => {
  it('không có document.fonts (jsdom): coi như xong ngay', () => {
    setFonts(undefined)
    expect(renderHook(() => useFontReady('Nunito')).result.current).toBe(true)
  })
  it('font hệ thống: xong ngay, không gọi load', () => {
    const load = vi.fn()
    setFonts(load)
    expect(renderHook(() => useFontReady('Arial')).result.current).toBe(true)
    expect(load).not.toHaveBeenCalled()
  })
  it('font tùy chỉnh: false lúc đầu, true khi mọi độ đậm nạp xong; nạp bằng câu mẫu có dấu tiếng Việt', async () => {
    let resolve: (value: unknown[]) => void = () => undefined
    const gate = new Promise<unknown[]>((r) => (resolve = r))
    const load = vi.fn(() => gate)
    setFonts(load)
    const { result } = renderHook(() => useFontReady('Nunito', [700, 800]))
    expect(result.current).toBe(false)
    expect(load).toHaveBeenCalledWith('700 24px "Nunito"', FONT_SAMPLE_TEXT)
    expect(load).toHaveBeenCalledWith('800 24px "Nunito"', FONT_SAMPLE_TEXT)
    await act(async () => resolve([{}]))
    expect(result.current).toBe(true)
  })
  it('không tìm thấy font (danh sách rỗng) hoặc nạp lỗi: ở lại false', async () => {
    setFonts(vi.fn(async () => []))
    const empty = renderHook(() => useFontReady('Nunito', [700]))
    await act(async () => undefined)
    expect(empty.result.current).toBe(false)
    setFonts(vi.fn(async () => Promise.reject(new Error('lỗi'))))
    const failing = renderHook(() => useFontReady('Nunito', [700]))
    await act(async () => undefined)
    expect(failing.result.current).toBe(false)
  })
  it('đóng màn trước khi nạp xong: không cập nhật state', async () => {
    let resolve: (value: unknown[]) => void = () => undefined
    const gate = new Promise<unknown[]>((r) => (resolve = r))
    setFonts(vi.fn(() => gate))
    const { result, unmount } = renderHook(() => useFontReady('Nunito', [700]))
    unmount()
    await act(async () => resolve([{}]))
    expect(result.current).toBe(false)
  })
})
