import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ThemeAsset } from '../theme/themeTypes'
import { FALLBACK_ASSET_SRC } from './assetLoader'
import { makeImageFactory } from './fakeImage'
import { useAssets } from './useAssets'

const asset = (id: string): ThemeAsset => ({ id, kind: 'svg', src: `data:image/svg+xml;utf8,<svg id="${id}"/>`, alt: id })

describe('useAssets', () => {
  it('bắt đầu ở trạng thái loading với tiến độ 0 rồi chuyển sang done kèm kết quả', async () => {
    const assets = [asset('a'), asset('b')]
    const { createImage } = makeImageFactory({})
    const { result } = renderHook(() => useAssets(assets, { createImage }))
    expect(result.current).toEqual({
      status: 'loading',
      progress: { settled: 0, loaded: 0, failed: 0, total: 2 },
      result: null,
    })
    await waitFor(() => expect(result.current.status).toBe('done'))
    expect(result.current.progress).toEqual({ settled: 2, loaded: 2, failed: 0, total: 2 })
    expect(result.current.result?.failedIds).toEqual([])
  })

  it('tài nguyên lỗi: done, failed đếm đúng và có ảnh dự phòng', async () => {
    const assets = [asset('a'), asset('b')]
    const { createImage } = makeImageFactory({ [asset('b').src]: 'fail' })
    const { result } = renderHook(() => useAssets(assets, { createImage }))
    await waitFor(() => expect(result.current.status).toBe('done'))
    expect(result.current.progress).toEqual({ settled: 2, loaded: 1, failed: 1, total: 2 })
    expect(result.current.result?.assets.get('b')?.src).toBe(FALLBACK_ASSET_SRC)
  })

  it('danh sách rỗng: done ngay với tổng 0', async () => {
    const assets: ThemeAsset[] = []
    const { result } = renderHook(() => useAssets(assets))
    await waitFor(() => expect(result.current.status).toBe('done'))
    expect(result.current.progress.total).toBe(0)
  })

  it('đổi danh sách thì quay về loading (không giữ kết quả cũ) rồi tải danh sách mới', async () => {
    const first = [asset('a')]
    const second = [asset('x'), asset('y')]
    const { createImage } = makeImageFactory({})
    const { result, rerender } = renderHook(({ assets }) => useAssets(assets, { createImage }), {
      initialProps: { assets: first },
    })
    await waitFor(() => expect(result.current.status).toBe('done'))
    rerender({ assets: second })
    expect(result.current.status).toBe('loading')
    expect(result.current.result).toBeNull()
    expect(result.current.progress.total).toBe(2)
    await waitFor(() => expect(result.current.status).toBe('done'))
    expect([...(result.current.result?.assets.keys() ?? [])]).toEqual(['x', 'y'])
  })

  it('hàm createImage tạo mới mỗi lần render không gây tải lại vô hạn', async () => {
    const assets = [asset('a'), asset('b')]
    const created: unknown[] = []
    const { result } = renderHook(() =>
      useAssets(assets, {
        createImage: () => {
          const image = makeImageFactory({}).createImage()
          created.push(image)
          return image
        },
      }),
    )
    await waitFor(() => expect(result.current.status).toBe('done'))
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(created).toHaveLength(2)
    expect(result.current.status).toBe('done')
  })

  it('rời component thì hủy: không còn bộ hẹn giờ treo', () => {
    vi.useFakeTimers()
    try {
      const assets = [asset('slow')]
      const { createImage } = makeImageFactory({ [asset('slow').src]: 'hang' })
      const { unmount } = renderHook(() => useAssets(assets, { createImage, timeoutMs: 5000 }))
      expect(vi.getTimerCount()).toBe(1)
      unmount()
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
