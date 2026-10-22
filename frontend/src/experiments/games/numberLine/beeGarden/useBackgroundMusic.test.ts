import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { MUSIC_VOLUME, useBackgroundMusic } from './useBackgroundMusic'

interface FakeHowl {
  opts: Record<string, unknown>
  on: boolean
  play: Mock<() => void>
  pause: Mock<() => void>
  stop: Mock<() => void>
  unload: Mock<() => void>
}
const h = vi.hoisted(() => ({ howls: [] as unknown[] }))
const howls = () => h.howls as FakeHowl[]

vi.mock('howler', () => ({
  Howl: class {
    record: FakeHowl
    constructor(opts: Record<string, unknown>) {
      this.record = {
        opts,
        on: false,
        play: vi.fn(() => void (this.record.on = true)),
        pause: vi.fn(() => void (this.record.on = false)),
        stop: vi.fn(() => void (this.record.on = false)),
        unload: vi.fn(),
      }
      h.howls.push(this.record)
    }
    play() { this.record.play() }
    pause() { this.record.pause() }
    stop() { this.record.stop() }
    unload() { this.record.unload() }
    playing() { return this.record.on }
  },
}))

const URL_A = '/a.mp3'
beforeEach(() => {
  h.howls = []
})

describe('useBackgroundMusic', () => {
  it('chưa có tệp nhạc: im lặng hoàn toàn, không tạo Howl, available = false', () => {
    const { result } = renderHook(() => useBackgroundMusic(undefined))
    expect(result.current.available).toBe(false)
    act(() => result.current.start())
    act(() => result.current.toggle())
    act(() => result.current.stop())
    expect(howls()).toHaveLength(0)
  })

  it('không tạo Howl cho tới khi start (trình duyệt chặn tự phát); start phát lặp, âm lượng nhỏ, đúng một Howl dù gọi nhiều lần', () => {
    const { result } = renderHook(() => useBackgroundMusic(URL_A))
    expect(howls()).toHaveLength(0)
    act(() => result.current.start())
    act(() => result.current.start())
    expect(howls()).toHaveLength(1)
    expect(howls()[0].opts).toMatchObject({ src: [URL_A], loop: true, volume: MUSIC_VOLUME })
    expect(MUSIC_VOLUME).toBeLessThanOrEqual(0.3)
    expect(howls()[0].play).toHaveBeenCalledTimes(1) // đang phát thì không phát lại
  })

  it('tắt thì tạm dừng, bật lại thì phát tiếp; tắt trước khi start thì start không phát', () => {
    const { result } = renderHook(() => useBackgroundMusic(URL_A))
    act(() => result.current.toggle()) // tắt khi chưa phát
    expect(result.current.muted).toBe(true)
    act(() => result.current.start())
    expect(howls()).toHaveLength(0)
    act(() => result.current.toggle()) // bật: ý định phát đã có từ start
    expect(result.current.muted).toBe(false)
    expect(howls()[0].play).toHaveBeenCalledTimes(1)
    act(() => result.current.toggle())
    expect(howls()[0].pause).toHaveBeenCalledTimes(1)
  })

  it('stop dừng hẳn và xóa ý định phát: bật nhạc sau đó không tự phát', () => {
    const { result } = renderHook(() => useBackgroundMusic(URL_A))
    act(() => result.current.start())
    act(() => result.current.stop())
    expect(howls()[0].stop).toHaveBeenCalled()
    act(() => result.current.toggle())
    act(() => result.current.toggle())
    expect(howls()[0].play).toHaveBeenCalledTimes(1)
  })

  it('tệp nhạc đến muộn sau khi đã bấm bắt đầu: phát ngay khi có tệp, đúng một Howl', () => {
    const { result, rerender } = renderHook(({ url }: { url: string | undefined }) => useBackgroundMusic(url), { initialProps: { url: undefined as string | undefined } })
    act(() => result.current.start())
    expect(howls()).toHaveLength(0)
    rerender({ url: URL_A })
    expect(howls()).toHaveLength(1)
    expect(howls()[0].play).toHaveBeenCalledTimes(1)
  })

  it('đóng màn: dừng và gỡ Howl', () => {
    const { result, unmount } = renderHook(() => useBackgroundMusic(URL_A))
    act(() => result.current.start())
    unmount()
    expect(howls()[0].stop).toHaveBeenCalled()
    expect(howls()[0].unload).toHaveBeenCalled()
  })

  it('đổi tệp nhạc: gỡ Howl cũ, phát tệp mới khi đang muốn phát', () => {
    const { result, rerender } = renderHook(({ url }: { url: string }) => useBackgroundMusic(url), { initialProps: { url: URL_A } })
    act(() => result.current.start())
    rerender({ url: '/b.mp3' })
    expect(howls()[0].unload).toHaveBeenCalled()
    expect(howls()).toHaveLength(2)
    expect(howls()[1].opts).toMatchObject({ src: ['/b.mp3'] })
    expect(howls()[1].play).toHaveBeenCalledTimes(1)
  })
})
