import { renderHook } from '@testing-library/react'
import type Konva from 'konva'
import { describe, expect, it, vi } from 'vitest'
import { useStaticCache } from './useStaticCache'

function fakeGroup() {
  const batchDraw = vi.fn()
  return { cache: vi.fn(), clearCache: vi.fn(), getLayer: () => ({ batchDraw }), batchDraw }
}

describe('useStaticCache', () => {
  it('chụp ảnh đệm đúng khung ở độ phân giải ≥ 2, vẽ lại layer; gỡ ảnh đệm khi đóng màn', () => {
    const group = fakeGroup()
    const ref = { current: group as unknown as Konva.Group }
    const { unmount } = renderHook(() => useStaticCache(ref, 760, 440))
    expect(group.cache).toHaveBeenCalledTimes(1)
    const options = group.cache.mock.calls[0][0] as { x: number; y: number; width: number; height: number; pixelRatio: number }
    expect(options).toMatchObject({ x: 0, y: 0, width: 760, height: 440 })
    expect(options.pixelRatio).toBeGreaterThanOrEqual(2)
    expect(group.batchDraw).toHaveBeenCalled()
    unmount()
    expect(group.clearCache).toHaveBeenCalledTimes(1)
  })
  it('đổi kích thước khung thì chụp lại (gỡ cái cũ trước)', () => {
    const group = fakeGroup()
    const ref = { current: group as unknown as Konva.Group }
    const { rerender } = renderHook(({ height }: { height: number }) => useStaticCache(ref, 760, height), { initialProps: { height: 440 } })
    rerender({ height: 500 })
    expect(group.clearCache).toHaveBeenCalledTimes(1)
    expect(group.cache).toHaveBeenCalledTimes(2)
  })
  it('chưa có node (ref rỗng) thì không làm gì và không ném lỗi', () => {
    expect(() => renderHook(() => useStaticCache({ current: null }, 760, 440))).not.toThrow()
  })
})

describe('useStaticCache: vùng chụp và phiên bản', () => {
  it('chụp đúng góc trên trái tuỳ chọn; đổi `version` (ví dụ phông chữ vừa tải xong) thì chụp lại', () => {
    const group = fakeGroup()
    const ref = { current: group as unknown as Konva.Group }
    const { rerender } = renderHook(({ version }: { version: string }) => useStaticCache(ref, 120, 120, { x: -60, y: -60, version }), { initialProps: { version: 'a' } })
    expect(group.cache.mock.calls[0][0]).toMatchObject({ x: -60, y: -60, width: 120, height: 120 })
    rerender({ version: 'a' })
    expect(group.cache).toHaveBeenCalledTimes(1)
    rerender({ version: 'b' })
    expect(group.cache).toHaveBeenCalledTimes(2)
  })
})
