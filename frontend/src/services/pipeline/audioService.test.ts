import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioService } from './audioService'

// Mock Howl constructor and instance methods
const mockPlay = vi.fn()
const mockStop = vi.fn()
const mockUnload = vi.fn()
const mockOnce = vi.fn()

vi.mock('howler', () => {
  return {
    Howl: class {
      play = mockPlay
      stop = mockStop
      unload = mockUnload
      once = mockOnce
      src: string[]

      constructor(options: { src: string[] }) {
        this.src = options.src
      }
    },
  }
})

describe('AudioService', () => {
  let service: AudioService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new AudioService()
  })

  it('không tạo trùng Howl instance cho cùng một URL', () => {
    const url = 'https://example.com/audio1.mp3'

    service.play(url)
    service.play(url)
    service.preload(url)

    expect(service.getCacheSize()).toBe(1)
    expect(mockPlay).toHaveBeenCalledTimes(2)
  })

  it('phát audio mới thì tự động stop audio đang phát trước đó (chống chồng tiếng)', () => {
    const url1 = 'https://example.com/audio1.mp3'
    const url2 = 'https://example.com/audio2.mp3'

    service.play(url1)
    expect(mockPlay).toHaveBeenCalledTimes(1)

    // Phát audio thứ 2
    service.play(url2)
    // audio1 phải được gọi stop trước khi audio2 play
    expect(mockStop).toHaveBeenCalledTimes(1)
    expect(mockPlay).toHaveBeenCalledTimes(2)
  })

  it('preload nạp instance vào cache mà không gọi play', () => {
    const url = 'https://example.com/next-question.mp3'

    service.preload(url)

    expect(service.getCacheSize()).toBe(1)
    expect(mockPlay).not.toHaveBeenCalled()
  })

  it('clearCache dọn sạch toàn bộ cache và gọi unload() trên từng Howl instance', () => {
    service.preload('https://example.com/audio1.mp3')
    service.preload('https://example.com/audio2.mp3')
    expect(service.getCacheSize()).toBe(2)

    service.clearCache()

    expect(mockUnload).toHaveBeenCalledTimes(2)
    expect(service.getCacheSize()).toBe(0)
    expect(service.getCurrentlyPlaying()).toBeNull()
  })

  it('bỏ qua nếu URL rỗng hoặc không hợp lệ', () => {
    service.play('')
    service.play('   ')
    service.preload('')

    expect(service.getCacheSize()).toBe(0)
    expect(mockPlay).not.toHaveBeenCalled()
  })

  it('gắn callback onEnd qua sound.once("end", onEnd) khi có truyền vào', () => {
    const onEnd = vi.fn()
    service.play('https://example.com/audio.mp3', onEnd)

    expect(mockOnce).toHaveBeenCalledWith('end', onEnd)
  })
})
