import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AudioCompareLab from './AudioCompareLab'

const h = vi.hoisted(() => ({
  instances: [] as Array<{ src: string[]; play: ReturnType<typeof vi.fn>; unload: ReturnType<typeof vi.fn>; emit: (event: string, ...args: unknown[]) => void }>,
  ctx: null as null | { state: string },
  unlock: vi.fn(async () => true),
  playService: vi.fn(() => true),
  unlocked: false,
}))

vi.mock('howler', () => {
  class Howl {
    src: string[]
    handlers = new Map<string, Array<(...args: unknown[]) => void>>()
    play = vi.fn(() => 7)
    unload = vi.fn()
    constructor(options: { src: string[] }) {
      this.src = options.src
      h.instances.push(this as never)
    }
    on(event: string, handler: (...args: unknown[]) => void) {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler])
      return this
    }
    emit(event: string, ...args: unknown[]) {
      for (const handler of this.handlers.get(event) ?? []) handler(...args)
    }
  }
  return {
    Howl,
    Howler: {
      get ctx() {
        return h.ctx
      },
    },
  }
})
vi.mock('./audioService', () => ({
  getAudioService: () => ({ unlock: h.unlock, play: h.playService, get isUnlocked() { return h.unlocked } }),
}))

const urlOriginals = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }
const created: string[] = []
const revoked: string[] = []

beforeEach(() => {
  h.instances.length = 0
  h.ctx = null
  h.unlocked = false
  h.unlock.mockClear()
  h.playService.mockClear()
  created.length = 0
  revoked.length = 0
  // jsdom không có createObjectURL: gắn bản giả trả URL khác nhau mỗi lần và ghi lại việc thu hồi (khôi phục ở afterEach).
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: () => created[created.push(`blob:tone-${created.length}`) - 1] })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: (url: string) => revoked.push(url) })
})
afterEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: urlOriginals.create })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: urlOriginals.revoke })
})

describe('AudioCompareLab', () => {
  it('lộ tín hiệu cho bộ đo khi mở và gỡ khi đóng', () => {
    const { unmount } = render(<AudioCompareLab />)
    expect(window.__audioCompare).toBeDefined()
    unmount()
    expect(window.__audioCompare).toBeUndefined()
  })

  it('đóng Lab: thu hồi blob URL và gỡ Howl đang giữ', () => {
    const { unmount } = render(<AudioCompareLab />)
    fireEvent.click(screen.getByRole('button', { name: 'Howler: phát (dùng lại)' }))
    unmount()
    expect(revoked).toEqual([created[0]])
    expect(h.instances[0].unload).toHaveBeenCalled()
  })

  it('StrictMode (effect chạy, dọn, chạy lại): Howler không bao giờ nhận blob URL đã thu hồi, và không có URL bị bỏ rơi', () => {
    const { unmount } = render(
      <StrictMode>
        <AudioCompareLab />
      </StrictMode>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Howler: phát (dùng lại)' }))
    const used = h.instances[0].src[0]
    expect(revoked).not.toContain(used)
    unmount()
    expect([...revoked].sort()).toEqual([...created].sort()) // mọi URL đã tạo đều được thu hồi
  })

  it('Howler dùng lại: tạo một lần từ blob WAV, các lần bấm sau phát lại cùng bản', () => {
    render(<AudioCompareLab />)
    fireEvent.click(screen.getByRole('button', { name: 'Howler: phát (dùng lại)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Howler: phát (dùng lại)' }))
    expect(h.instances).toHaveLength(1)
    expect(h.instances[0].src).toEqual([created[0]])
    expect(h.instances[0].play).toHaveBeenCalledTimes(2)
  })

  it('Howler tạo mới: mỗi lần bấm gỡ bản cũ rồi dựng bản mới', () => {
    render(<AudioCompareLab />)
    const button = screen.getByRole('button', { name: 'Howler: tạo mới rồi phát' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(h.instances).toHaveLength(2)
    expect(h.instances[0].unload).toHaveBeenCalledTimes(1)
    expect(h.instances[1].play).toHaveBeenCalledTimes(1)
  })

  it('trả mốc thời gian lúc gọi và ghi sự kiện load/play vào nhật ký của tín hiệu', () => {
    render(<AudioCompareLab />)
    const before = performance.now()
    const t0 = window.__audioCompare!.howlerPlay(true)
    expect(t0).toBeGreaterThanOrEqual(before)
    h.instances[0].emit('load')
    h.instances[0].emit('play')
    expect(window.__audioCompare!.events().map((event) => event.type)).toEqual(['load', 'play'])
  })

  it('Web Audio: mở khóa rồi mới phát', async () => {
    render(<AudioCompareLab />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Web Audio: phát «Đúng»' }))
    })
    expect(h.unlock).toHaveBeenCalledTimes(1)
    expect(h.playService).toHaveBeenCalledWith('correct')
    expect(h.unlock.mock.invocationCallOrder[0]).toBeLessThan(h.playService.mock.invocationCallOrder[0])
  })

  it('synthPlayNow chỉ phát, không mở khóa', () => {
    render(<AudioCompareLab />)
    window.__audioCompare!.synthPlayNow('correct')
    expect(h.unlock).not.toHaveBeenCalled()
    expect(h.playService).toHaveBeenCalledTimes(1)
  })

  it('tệp không tồn tại: ghi lại loaderror, không ném lỗi, play vẫn trả về mã', async () => {
    vi.useFakeTimers()
    render(<AudioCompareLab />)
    const pending = window.__audioCompare!.howlerMissing(1500)
    h.instances[0].emit('loaderror', 1, 'Failed loading audio file')
    await vi.advanceTimersByTimeAsync(1500)
    const result = await pending
    vi.useRealTimers()
    expect(result.threw).toBe(false)
    expect(result.playReturned).toBe(7)
    expect(result.events.map((event) => event.type)).toEqual(['loaderror'])
    expect(result.events[0].detail).toBe('Failed loading audio file')
    expect(h.instances[0].src[0]).toContain('khong-co-tep')
    expect(h.instances[0].unload).toHaveBeenCalledTimes(1) // gỡ Howl của tệp thiếu
  })

  it('trạng thái ngữ cảnh: Howler chưa có thì null, có thì trả state; synth theo isUnlocked', () => {
    render(<AudioCompareLab />)
    expect(window.__audioCompare!.howlerContextState()).toBeNull()
    h.ctx = { state: 'suspended' }
    expect(window.__audioCompare!.howlerContextState()).toBe('suspended')
    expect(window.__audioCompare!.synthUnlocked()).toBe(false)
    h.unlocked = true
    expect(window.__audioCompare!.synthUnlocked()).toBe(true)
  })

  it('nhật ký hiển thị tối đa vài dòng gần nhất', () => {
    render(<AudioCompareLab />)
    for (let i = 0; i < 9; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Howler: phát (dùng lại)' }))
    expect(screen.getByRole('list', { name: 'Nhật ký' }).querySelectorAll('li')).toHaveLength(6)
  })
})
