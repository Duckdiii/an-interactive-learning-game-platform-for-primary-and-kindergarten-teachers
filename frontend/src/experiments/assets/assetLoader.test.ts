import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ThemeAsset } from '../theme/themeTypes'
import { neutralTheme } from '../theme/themes/neutral'
import { validateTheme } from '../theme/validateTheme'
import {
  DEFAULT_ASSET_TIMEOUT_MS,
  FALLBACK_ASSET_SRC,
  loadAssets,
  type ImageLike,
  type LoadProgress,
} from './assetLoader'
import { makeImageFactory } from './fakeImage'

const asset = (id: string): ThemeAsset => ({
  id,
  kind: 'svg',
  src: `data:image/svg+xml;utf8,<svg id="${id}"/>`,
  alt: id,
})

describe('FALLBACK_ASSET_SRC', () => {
  it('là SVG nhúng hợp lệ theo validateTheme (không tải ngoài, không mã chạy được)', () => {
    const theme = { ...neutralTheme, assets: [{ id: 'fallback', kind: 'svg' as const, src: FALLBACK_ASSET_SRC, alt: 'Ảnh dự phòng' }] }
    expect(validateTheme(theme)).toEqual([])
  })
})

describe('loadAssets', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('tải hết thì mọi tài nguyên ready, giữ nguyên src và có ảnh', async () => {
    const { createImage } = makeImageFactory({})
    const result = await loadAssets([asset('a'), asset('b')], { createImage })
    expect(result.failedIds).toEqual([])
    expect([...result.assets.keys()]).toEqual(['a', 'b'])
    const a = result.assets.get('a')!
    expect(a.status).toBe('ready')
    expect(a.src).toBe(asset('a').src)
    expect(a.image).not.toBeNull()
  })

  it('tiến độ: một lần bằng 0 lúc đầu, rồi tăng đều tới tổng, loaded + failed = settled', async () => {
    const { createImage } = makeImageFactory({ [asset('b').src]: 'fail' })
    const calls: LoadProgress[] = []
    await loadAssets([asset('a'), asset('b'), asset('c')], { createImage, onProgress: (p) => calls.push(p) })
    expect(calls[0]).toEqual({ settled: 0, loaded: 0, failed: 0, total: 3 })
    expect(calls.map((p) => p.settled)).toEqual([0, 1, 2, 3])
    for (const p of calls) expect(p.loaded + p.failed).toBe(p.settled)
    expect(calls.at(-1)).toEqual({ settled: 3, loaded: 2, failed: 1, total: 3 })
  })

  it('một tài nguyên lỗi không làm hỏng cả bộ: failed + ảnh dự phòng, image null', async () => {
    const { createImage } = makeImageFactory({ [asset('b').src]: 'fail' })
    const result = await loadAssets([asset('a'), asset('b')], { createImage })
    expect(result.failedIds).toEqual(['b'])
    expect(result.assets.get('a')!.status).toBe('ready')
    const b = result.assets.get('b')!
    expect(b).toMatchObject({ status: 'failed', src: FALLBACK_ASSET_SRC, image: null })
  })

  it('decode() bị từ chối thì coi là lỗi', async () => {
    const { createImage } = makeImageFactory({ [asset('a').src]: 'decode-fail' })
    const result = await loadAssets([asset('a')], { createImage })
    expect(result.failedIds).toEqual(['a'])
  })

  it('trình duyệt không có decode() thì onload là đủ', async () => {
    const { createImage } = makeImageFactory({}, { withDecode: false })
    const result = await loadAssets([asset('a')], { createImage })
    expect(result.assets.get('a')!.status).toBe('ready')
  })

  it('quá hạn thì lỗi: chưa tới hạn vẫn chờ, tới hạn thì failed', async () => {
    const { createImage } = makeImageFactory({ [asset('slow').src]: 'hang' })
    const done = vi.fn()
    const promise = loadAssets([asset('slow')], { createImage, timeoutMs: 1000 }).then(done)
    await vi.advanceTimersByTimeAsync(999)
    expect(done).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await promise
    expect(done).toHaveBeenCalledTimes(1)
    expect(done.mock.calls[0][0].failedIds).toEqual(['slow'])
  })

  it('hạn mặc định là DEFAULT_ASSET_TIMEOUT_MS', async () => {
    const { createImage } = makeImageFactory({ [asset('slow').src]: 'hang' })
    const done = vi.fn()
    const promise = loadAssets([asset('slow')], { createImage }).then(done)
    await vi.advanceTimersByTimeAsync(DEFAULT_ASSET_TIMEOUT_MS - 1)
    expect(done).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await promise
    expect(done).toHaveBeenCalledTimes(1)
  })

  it('một tài nguyên treo không chặn tiến độ của các tài nguyên khác', async () => {
    const { createImage } = makeImageFactory({ [asset('slow').src]: 'hang' })
    const calls: LoadProgress[] = []
    const promise = loadAssets([asset('a'), asset('slow')], { createImage, timeoutMs: 1000, onProgress: (p) => calls.push(p) })
    await vi.advanceTimersByTimeAsync(0)
    expect(calls.at(-1)).toEqual({ settled: 1, loaded: 1, failed: 0, total: 2 })
    await vi.advanceTimersByTimeAsync(1000)
    const result = await promise
    expect(result.failedIds).toEqual(['slow'])
  })

  it('danh sách rỗng: xong ngay, tiến độ một lần bằng 0', async () => {
    const calls: LoadProgress[] = []
    const result = await loadAssets([], { onProgress: (p) => calls.push(p) })
    expect(result.assets.size).toBe(0)
    expect(result.failedIds).toEqual([])
    expect(calls).toEqual([{ settled: 0, loaded: 0, failed: 0, total: 0 }])
  })

  it('trùng mã: lấy mục đầu, chỉ tải một lần', async () => {
    const first = asset('x')
    const second = { ...asset('x'), src: 'data:image/svg+xml;utf8,<svg id="other"/>' }
    const { createImage, created } = makeImageFactory({})
    const result = await loadAssets([first, second], { createImage })
    expect(created).toHaveLength(1)
    expect(result.assets.get('x')!.src).toBe(first.src)
  })

  describe('hủy', () => {
    it('đã hủy từ trước thì từ chối ngay và không tạo ảnh nào', async () => {
      const controller = new AbortController()
      controller.abort()
      const { createImage, created } = makeImageFactory({})
      await expect(loadAssets([asset('a')], { createImage, signal: controller.signal })).rejects.toMatchObject({
        name: 'AbortError',
      })
      expect(created).toHaveLength(0)
    })

    it('hủy giữa chừng: từ chối AbortError và không gọi onProgress nữa', async () => {
      const controller = new AbortController()
      const { createImage } = makeImageFactory({ [asset('slow').src]: 'hang' })
      const calls: LoadProgress[] = []
      const promise = loadAssets([asset('a'), asset('slow')], {
        createImage,
        signal: controller.signal,
        onProgress: (p) => calls.push(p),
      })
      const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' })
      await vi.advanceTimersByTimeAsync(0)
      const callsBeforeAbort = calls.length
      controller.abort()
      await assertion
      await vi.advanceTimersByTimeAsync(DEFAULT_ASSET_TIMEOUT_MS * 2)
      expect(calls).toHaveLength(callsBeforeAbort)
    })

    it('hủy dọn bộ hẹn giờ: không còn timer treo', async () => {
      const controller = new AbortController()
      const { createImage } = makeImageFactory({ [asset('slow').src]: 'hang' })
      const promise = loadAssets([asset('slow')], { createImage, signal: controller.signal })
      const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' })
      controller.abort()
      await assertion
      expect(vi.getTimerCount()).toBe(0)
    })

    it('hủy hai lần không gây lỗi', async () => {
      const controller = new AbortController()
      const { createImage } = makeImageFactory({ [asset('slow').src]: 'hang' })
      const promise = loadAssets([asset('slow')], { createImage, signal: controller.signal })
      const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' })
      controller.abort()
      controller.abort()
      await assertion
    })

    it('xong rồi thì gỡ trình nghe abort khỏi signal dùng chung và hủy muộn không có tác dụng', async () => {
      const controller = new AbortController()
      const add = vi.spyOn(controller.signal, 'addEventListener')
      const remove = vi.spyOn(controller.signal, 'removeEventListener')
      const calls: LoadProgress[] = []
      const { createImage } = makeImageFactory({})
      const result = await loadAssets([asset('a'), asset('b')], {
        createImage,
        signal: controller.signal,
        onProgress: (p) => calls.push(p),
      })
      expect(add.mock.calls.length).toBeGreaterThan(0)
      expect(remove.mock.calls.length).toBe(add.mock.calls.length)
      controller.abort()
      expect(calls).toHaveLength(3)
      expect(result.failedIds).toEqual([])
    })
  })

  it('decode() treo thì vẫn quá hạn thành failed', async () => {
    const { createImage } = makeImageFactory({ [asset('a').src]: 'decode-hang' })
    const promise = loadAssets([asset('a')], { createImage, timeoutMs: 500 })
    await vi.advanceTimersByTimeAsync(500)
    const result = await promise
    expect(result.failedIds).toEqual(['a'])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('dựng ảnh ném lỗi: chỉ tài nguyên đó failed, bộ vẫn xong', async () => {
    const real = makeImageFactory({})
    let count = 0
    const createImage = (): ImageLike => {
      count += 1
      if (count === 2) throw new Error('boom')
      return real.createImage()
    }
    const result = await loadAssets([asset('a'), asset('b'), asset('c')], { createImage })
    expect(result.failedIds).toEqual(['b'])
    expect(result.assets.get('c')!.status).toBe('ready')
  })

  it('gán src ném lỗi: tài nguyên đó failed', async () => {
    const createImage = (): ImageLike => ({
      onload: null,
      onerror: null,
      set src(_value: string) {
        throw new Error('bad src')
      },
    } as unknown as ImageLike)
    const result = await loadAssets([asset('a')], { createImage })
    expect(result.failedIds).toEqual(['a'])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('onload/onerror của ảnh được gỡ sau khi xong (không rò rỉ)', async () => {
    const { createImage, created } = makeImageFactory({})
    await loadAssets([asset('a')], { createImage })
    const image: ImageLike = created[0]
    expect(image.onload).toBeNull()
    expect(image.onerror).toBeNull()
  })
})
