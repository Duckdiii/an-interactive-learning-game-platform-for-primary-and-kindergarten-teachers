import { renderHook } from '@testing-library/react'
import type Konva from 'konva'
import { describe, expect, it, vi } from 'vitest'
import { useStaticCache } from './useStaticCache'

const fakeGroup = () => ({ cache: vi.fn(), clearCache: vi.fn(), getLayer: () => null })

describe('useStaticCache: làm mờ một lần', () => {
  it('có blur thì sau khi chụp áp bộ lọc làm mờ MỘT lần (không áp lại khi vẽ lại cùng tham số)', () => {
    const group = { ...fakeGroup(), filters: vi.fn(), blurRadius: vi.fn() }
    const ref = { current: group as unknown as Konva.Group }
    const { rerender } = renderHook(({ blur }: { blur: number }) => useStaticCache(ref, 760, 440, { blur }), { initialProps: { blur: 2 } })
    expect(group.cache).toHaveBeenCalledTimes(1)
    expect(group.filters).toHaveBeenCalledTimes(1)
    expect(group.blurRadius).toHaveBeenCalledWith(2)
    rerender({ blur: 2 })
    expect(group.cache).toHaveBeenCalledTimes(1)
    expect(group.filters).toHaveBeenCalledTimes(1)
  })
  it('không có blur thì không áp bộ lọc; node không có bộ lọc (jsdom) thì bỏ qua, không ném lỗi', () => {
    const plain = { ...fakeGroup(), filters: vi.fn(), blurRadius: vi.fn() }
    renderHook(() => useStaticCache({ current: plain as unknown as Konva.Group }, 760, 440))
    expect(plain.filters).not.toHaveBeenCalled()
    const noFilters = fakeGroup()
    expect(() => renderHook(() => useStaticCache({ current: noFilters as unknown as Konva.Group }, 760, 440, { blur: 3 }))).not.toThrow()
    expect(noFilters.cache).toHaveBeenCalledTimes(1)
  })
})
