import { beforeEach, describe, expect, it, vi } from 'vitest'

const howlCtorMock = vi.fn()
const howlPlayMock = vi.fn()
vi.mock('howler', () => ({
  Howl: class {
    constructor(options: unknown) {
      howlCtorMock(options)
    }
    play = howlPlayMock
  },
}))

const confettiMock = vi.fn()
vi.mock('canvas-confetti', () => ({ default: (...args: unknown[]) => confettiMock(...args) }))

/**
 * Bộ đệm `Howl` nằm ở cấp module nên mỗi test nạp lại module để bắt đầu từ trạng thái trống.
 */
async function loadShowFeedback() {
  vi.resetModules()
  const feedbackModule = await import('./useFeedback')
  // `useFeedback` không dùng hook nào của React nên gọi thẳng được, không cần render component.
  return feedbackModule.useFeedback().showFeedback
}

describe('useFeedback', () => {
  beforeEach(() => {
    howlCtorMock.mockClear()
    howlPlayMock.mockClear()
    confettiMock.mockClear()
  })

  it('import module không tạo Howl nào (tạo lười)', async () => {
    await loadShowFeedback()

    expect(howlCtorMock).not.toHaveBeenCalled()
  })

  it('trả lời đúng nhiều lần chỉ tạo một Howl cho âm đúng, nhưng phát mỗi lần và bắn confetti', async () => {
    const showFeedback = await loadShowFeedback()

    showFeedback(true)
    showFeedback(true)
    showFeedback(true)

    expect(howlCtorMock).toHaveBeenCalledTimes(1)
    expect(howlCtorMock).toHaveBeenCalledWith({ src: ['/sounds/correct.wav'] })
    expect(howlPlayMock).toHaveBeenCalledTimes(3)
    expect(confettiMock).toHaveBeenCalledTimes(3)
  })

  it('trả lời sai: phát âm nhẹ riêng, không bắn confetti, cũng chỉ tạo Howl một lần', async () => {
    const showFeedback = await loadShowFeedback()

    showFeedback(false)
    showFeedback(false)

    expect(howlCtorMock).toHaveBeenCalledTimes(1)
    expect(howlCtorMock).toHaveBeenCalledWith({ src: ['/sounds/try-again.wav'] })
    expect(howlPlayMock).toHaveBeenCalledTimes(2)
    expect(confettiMock).not.toHaveBeenCalled()
  })

  it('đúng rồi sai: hai âm khác nhau, mỗi âm đúng một Howl', async () => {
    const showFeedback = await loadShowFeedback()

    showFeedback(true)
    showFeedback(false)
    showFeedback(true)
    showFeedback(false)

    expect(howlCtorMock).toHaveBeenCalledTimes(2)
  })
})
