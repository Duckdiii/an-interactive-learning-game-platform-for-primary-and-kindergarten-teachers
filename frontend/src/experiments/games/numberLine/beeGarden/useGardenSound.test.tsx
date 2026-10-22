import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioService } from '../../../audio/audioService'
import { FakeAudioContext } from '../../../audio/fakeAudioContext'
import { SOUND_PREF_KEYS } from './soundPrefs'
import { useGardenSound } from './useGardenSound'

vi.mock('howler', () => ({ Howler: { mute: vi.fn() } }))

function setup() {
  const context = new FakeAudioContext({ initialState: 'suspended' })
  const service = new AudioService({ createContext: () => context })
  const setHowlerMuted = vi.fn()
  const hook = renderHook(() => useGardenSound({ service, setHowlerMuted }))
  return { context, service, setHowlerMuted, ...hook }
}

beforeEach(() => {
  window.sessionStorage.clear()
})
afterEach(() => {
  window.sessionStorage.clear()
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})

describe('useGardenSound', () => {
  it('mặc định bật tiếng và bật âm nền; AudioContext CHƯA được dựng cho tới khi gọi begin() (chính sách autoplay)', () => {
    const { result, context } = setup()
    expect(result.current.muted).toBe(false)
    expect(result.current.ambienceOn).toBe(true)
    expect(context.oscillators).toHaveLength(0)
    expect(context.sources).toHaveLength(0)
    expect(context.resumeCalls).toBe(0)
  })

  it('begin() (trong cử chỉ bấm) mở khóa rồi bật âm nền: gió và ong vo ve được dựng', async () => {
    const { result, context } = setup()
    await act(async () => {
      result.current.begin()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(context.resumeCalls).toBe(1)
    expect(context.sources).toHaveLength(1)
    expect(context.oscillators.length).toBeGreaterThanOrEqual(2)
  })

  it('tắt tiếng: dịch vụ âm thanh và Howler cùng tắt, nhớ trong phiên, bật lại thì mở', () => {
    const { result, service, setHowlerMuted } = setup()
    act(() => result.current.toggleMuted())
    expect(result.current.muted).toBe(true)
    expect(service.isMuted).toBe(true)
    expect(setHowlerMuted).toHaveBeenLastCalledWith(true)
    expect(window.sessionStorage.getItem(SOUND_PREF_KEYS.muted)).toBe('1')
    act(() => result.current.toggleMuted())
    expect(service.isMuted).toBe(false)
    expect(setHowlerMuted).toHaveBeenLastCalledWith(false)
    expect(window.sessionStorage.getItem(SOUND_PREF_KEYS.muted)).toBe('0')
  })

  it('lựa chọn đã nhớ được áp ngay khi vào lại trong cùng phiên (đã tắt tiếng thì vào lại vẫn tắt)', () => {
    window.sessionStorage.setItem(SOUND_PREF_KEYS.muted, '1')
    window.sessionStorage.setItem(SOUND_PREF_KEYS.ambience, '0')
    const { result, service } = setup()
    expect(result.current.muted).toBe(true)
    expect(result.current.ambienceOn).toBe(false)
    expect(service.isMuted).toBe(true)
  })

  it('tắt âm nền: dừng gió/chim và không bật lại khi begin() sau đó; bật lại (đã mở khóa) thì chạy lại', async () => {
    const { result, context } = setup()
    await act(async () => {
      result.current.begin()
      await Promise.resolve()
      await Promise.resolve()
    })
    const stopsBefore = context.sources.filter((source) => source.stoppedAt !== null).length
    act(() => result.current.toggleAmbience())
    expect(result.current.ambienceOn).toBe(false)
    expect(context.sources.filter((source) => source.stoppedAt !== null).length).toBeGreaterThan(stopsBefore)
    expect(window.sessionStorage.getItem(SOUND_PREF_KEYS.ambience)).toBe('0')
    await act(async () => {
      result.current.begin()
      await Promise.resolve()
    })
    expect(context.sources).toHaveLength(1) // không dựng lại khi đang tắt
    act(() => result.current.toggleAmbience())
    expect(context.sources).toHaveLength(2) // bật lại: dựng nguồn mới
  })

  it('follow chuyển cho âm nền: ong bay thì có tiếng vo ve (tăng độ ồn của nhánh vo ve), ngừng bay thì tắt', async () => {
    const { result, context } = setup()
    await act(async () => {
      result.current.begin()
      await Promise.resolve()
      await Promise.resolve()
    })
    const buzz = context.gains.find((gain) => gain.connections.includes(context.panners[0]))!
    act(() => result.current.follow(true, 0.4))
    expect(buzz.gain.value).toBeGreaterThan(0)
    expect(context.panners[0].pan.value).toBeCloseTo(0.4, 10)
    act(() => result.current.follow(false, 0.4))
    expect(buzz.gain.value).toBe(0)
  })

  it('tab bị ẩn: âm nền tạm dừng (hạ về 0); hiện lại thì tiếp tục', async () => {
    const { result, context } = setup()
    await act(async () => {
      result.current.begin()
      await Promise.resolve()
      await Promise.resolve()
    })
    const bus = context.gains.find((gain) => gain.gain.events.some((event) => event.value === 1) && !gain.connections.includes(context.panners[0]))!
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(bus.gain.value).toBe(0)
    act(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(bus.gain.value).toBe(1)
  })

  it('đóng màn: dừng âm nền, gỡ nghe visibilitychange, trả lại trạng thái tiếng như lúc vào (không để lại tắt tiếng cho trang khác)', async () => {
    const { result, context, service, setHowlerMuted, unmount } = setup()
    act(() => result.current.toggleMuted())
    await act(async () => {
      result.current.begin()
      await Promise.resolve()
      await Promise.resolve()
    })
    unmount()
    expect(service.isMuted).toBe(false)
    expect(setHowlerMuted).toHaveBeenLastCalledWith(false)
    expect(context.sources.every((source) => source.stoppedAt !== null)).toBe(true)
    const gainsBefore = context.gains.map((gain) => gain.gain.events.length)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(context.gains.map((gain) => gain.gain.events.length)).toEqual(gainsBefore)
  })
})
