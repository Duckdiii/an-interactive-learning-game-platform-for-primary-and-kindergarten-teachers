import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { useNarration } from './useNarration'

interface FakeHowl {
  opts: Record<string, (() => void) | unknown>
  play: Mock<() => void>
  stop: Mock<() => void>
  unload: Mock<() => void>
}
const h = vi.hoisted(() => ({ howls: [] as unknown[] }))
const howls = () => h.howls as FakeHowl[]
const fire = (index: number, event: string) => act(() => (howls()[index].opts[event] as () => void)())

vi.mock('howler', () => ({
  Howl: class {
    record: FakeHowl
    constructor(opts: Record<string, unknown>) {
      this.record = { opts, play: vi.fn(), stop: vi.fn(), unload: vi.fn() }
      h.howls.push(this.record)
    }
    play() { this.record.play() }
    stop() { this.record.stop() }
    unload() { this.record.unload() }
  },
}))

beforeEach(() => {
  h.howls = []
})

describe('useNarration', () => {
  it('không có tệp giọng đọc: không tạo Howl, play không làm gì, không bao giờ «đang đọc»', () => {
    const { result } = renderHook(() => useNarration(undefined))
    act(() => result.current.play())
    expect(howls()).toHaveLength(0)
    expect(result.current.speaking).toBe(false)
  })

  it('tạo một Howl cho tệp; play dừng bản đang đọc rồi đọc lại từ đầu (bấm nhiều lần không chồng tiếng)', () => {
    const { result } = renderHook(() => useNarration('/q.wav'))
    expect(howls()).toHaveLength(1)
    expect(howls()[0].opts.src).toEqual(['/q.wav'])
    act(() => result.current.play())
    act(() => result.current.play())
    expect(howls()[0].stop).toHaveBeenCalledTimes(2)
    expect(howls()[0].play).toHaveBeenCalledTimes(2)
  })

  it('cờ «đang đọc»: bật khi bắt đầu phát; tắt khi đọc xong, dừng, tạm dừng, lỗi tải hoặc lỗi phát', () => {
    const { result } = renderHook(() => useNarration('/q.wav'))
    for (const end of ['onend', 'onstop', 'onpause', 'onloaderror', 'onplayerror']) {
      fire(0, 'onplay')
      expect(result.current.speaking, `bật trước ${end}`).toBe(true)
      fire(0, end)
      expect(result.current.speaking, end).toBe(false)
    }
  })

  it('đổi câu (đổi tệp): gỡ Howl cũ, tạo Howl mới, cờ về false; đóng màn thì gỡ', () => {
    const { result, rerender, unmount } = renderHook(({ url }: { url: string }) => useNarration(url), { initialProps: { url: '/a.wav' } })
    fire(0, 'onplay')
    expect(result.current.speaking).toBe(true)
    rerender({ url: '/b.wav' })
    expect(howls()[0].unload).toHaveBeenCalled()
    expect(howls()).toHaveLength(2)
    expect(result.current.speaking).toBe(false)
    unmount()
    expect(howls()[1].unload).toHaveBeenCalled()
  })

  it('bỏ tệp (url rỗng) giữa chừng: cờ «đang đọc» không còn kẹt true', () => {
    const { result, rerender } = renderHook(({ url }: { url: string | undefined }) => useNarration(url), { initialProps: { url: '/a.wav' as string | undefined } })
    fire(0, 'onplay')
    rerender({ url: undefined })
    expect(result.current.speaking).toBe(false)
  })
})
