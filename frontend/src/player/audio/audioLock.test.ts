import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ ctx: undefined as { state: string; resume: () => Promise<void> } | undefined, lazyCtx: undefined as { state: string; resume: () => Promise<void> } | undefined }))
vi.mock('howler', () => ({
  Howler: {
    get ctx() {
      return state.ctx
    },
    // Như Howler thật: volume() tạo AudioContext nếu chưa có.
    volume() {
      state.ctx ??= state.lazyCtx
    },
  },
}))

import { isAudioLocked, resumeAudioContext, setAudioLockSimulated, unlockAudio } from './audioLock'

const resume = vi.fn(() => Promise.resolve())

afterEach(() => {
  setAudioLockSimulated(false)
  state.ctx = undefined
  state.lazyCtx = undefined
  Reflect.deleteProperty(navigator, 'userActivation')
  resume.mockClear()
})

describe('audioLock', () => {
  it('mặc định không khóa; cờ giả lập thì khóa', () => {
    expect(isAudioLocked()).toBe(false)
    setAudioLockSimulated(true)
    expect(isAudioLocked()).toBe(true)
  })

  it('userActivation.hasBeenActive=false thì khóa', () => {
    Object.defineProperty(navigator, 'userActivation', { value: { hasBeenActive: false }, configurable: true })
    expect(isAudioLocked()).toBe(true)
    Object.defineProperty(navigator, 'userActivation', { value: { hasBeenActive: true }, configurable: true })
    expect(isAudioLocked()).toBe(false)
  })

  it('AudioContext suspended thì khóa', () => {
    state.ctx = { state: 'suspended', resume }
    expect(isAudioLocked()).toBe(true)
  })

  it('chưa có AudioContext (chưa tạo Howl nào): vẫn tạo để kiểm và mở được (iOS Safari)', () => {
    state.lazyCtx = { state: 'suspended', resume }
    Object.defineProperty(navigator, 'userActivation', { value: { hasBeenActive: true }, configurable: true })

    expect(isAudioLocked()).toBe(true)
    resumeAudioContext()
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it('unlockAudio xóa cờ và resume; resumeAudioContext resume nhưng không xóa cờ', async () => {
    state.ctx = { state: 'running', resume }
    setAudioLockSimulated(true)

    resumeAudioContext()
    expect(resume).toHaveBeenCalledTimes(1)
    expect(isAudioLocked()).toBe(true)

    await unlockAudio()
    expect(resume).toHaveBeenCalledTimes(2)
    expect(isAudioLocked()).toBe(false)
  })
})
