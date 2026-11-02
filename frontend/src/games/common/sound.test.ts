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

/** Bộ đệm `Howl` nằm ở cấp module nên mỗi test nạp lại module để bắt đầu từ trạng thái trống. */
async function loadPlaySound() {
  vi.resetModules()
  const soundModule = await import('./sound')
  return soundModule.playSound
}

describe('playSound', () => {
  beforeEach(() => {
    howlCtorMock.mockClear()
    howlPlayMock.mockClear()
  })

  it('import module không tạo Howl nào (tạo lười)', async () => {
    await loadPlaySound()

    expect(howlCtorMock).not.toHaveBeenCalled()
  })

  it('phát nhiều lần cùng một file chỉ tạo một Howl nhưng phát mỗi lần', async () => {
    const playSound = await loadPlaySound()

    playSound('/sounds/a.wav')
    playSound('/sounds/a.wav')
    playSound('/sounds/a.wav')

    expect(howlCtorMock).toHaveBeenCalledTimes(1)
    expect(howlCtorMock).toHaveBeenCalledWith({ src: ['/sounds/a.wav'] })
    expect(howlPlayMock).toHaveBeenCalledTimes(3)
  })

  it('mỗi file khác nhau có Howl riêng', async () => {
    const playSound = await loadPlaySound()

    playSound('/sounds/a.wav')
    playSound('/sounds/b.wav')
    playSound('/sounds/a.wav')

    expect(howlCtorMock).toHaveBeenCalledTimes(2)
    expect(howlPlayMock).toHaveBeenCalledTimes(3)
  })
})
