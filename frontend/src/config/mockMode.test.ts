import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MOCK_GROUPS,
  anyMock,
  getMockGroups,
  isMock,
  parseMockSetting,
  resetMockWarning,
  unknownMockTokens,
  warnMockMode,
} from './mockMode'

describe('parseMockSetting', () => {
  it('bỏ trống: bật hết ở môi trường phát triển, tắt hết ở bản build', () => {
    expect([...parseMockSetting(undefined, true)]).toEqual([...MOCK_GROUPS])
    expect([...parseMockSetting('', true)]).toEqual([...MOCK_GROUPS])
    expect(parseMockSetting(undefined, false).size).toBe(0)
    expect(parseMockSetting('   ', false).size).toBe(0)
  })

  it('"all" bật hết và "none" tắt hết, bất kể môi trường', () => {
    expect(parseMockSetting('all', false).size).toBe(MOCK_GROUPS.length)
    expect(parseMockSetting('ALL', false).size).toBe(MOCK_GROUPS.length)
    expect(parseMockSetting('none', true).size).toBe(0)
  })

  it('danh sách nhóm: chỉ bật các nhóm được nêu, bỏ qua khoảng trắng, chữ hoa và tên lạ', () => {
    expect([...parseMockSetting('games, AI ,sessions', false)]).toEqual(['games', 'ai', 'sessions'])
    expect([...parseMockSetting('games,khong-co,auth', true)]).toEqual(['games'])
  })

  it('"all" nằm trong danh sách vẫn bật hết', () => {
    expect(parseMockSetting('games,all', false).size).toBe(MOCK_GROUPS.length)
  })

  it('đăng nhập không phải một nhóm mô phỏng: gõ "auth" hay "login" không bật gì', () => {
    expect(MOCK_GROUPS).not.toContain('auth')
    expect(parseMockSetting('auth,login', true).size).toBe(0)
  })

  it('unknownMockTokens trả các mục gõ sai để cảnh báo', () => {
    expect(unknownMockTokens('games, game ,ai;sessions,all')).toEqual(['game', 'ai;sessions'])
    expect(unknownMockTokens('')).toEqual([])
    expect(unknownMockTokens(undefined)).toEqual([])
    expect(unknownMockTokens('none')).toEqual([])
  })
})

describe('đọc cờ từ môi trường', () => {
  afterEach(() => vi.stubEnv('VITE_USE_MOCK', 'none'))

  it('isMock và anyMock theo VITE_USE_MOCK hiện tại', () => {
    vi.stubEnv('VITE_USE_MOCK', 'games,ai')

    expect(isMock('games')).toBe(true)
    expect(isMock('ai')).toBe(true)
    expect(isMock('sessions')).toBe(false)
    expect(anyMock()).toBe(true)
    expect([...getMockGroups()]).toEqual(['games', 'ai'])
  })

  it('"none" thì không nhóm nào mô phỏng', () => {
    vi.stubEnv('VITE_USE_MOCK', 'none')

    expect(anyMock()).toBe(false)
  })
})

describe('warnMockMode', () => {
  afterEach(() => {
    vi.stubEnv('VITE_USE_MOCK', 'none')
    resetMockWarning()
  })

  it('cảnh báo đúng một lần, nêu rõ các nhóm đang mô phỏng và cách tắt', () => {
    vi.stubEnv('VITE_USE_MOCK', 'games,ai')
    resetMockWarning()
    const log = vi.fn()

    warnMockMode(log)
    warnMockMode(log)

    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0]).toContain('DỮ LIỆU MÔ PHỎNG')
    expect(log.mock.calls[0][0]).toContain('games, ai')
    expect(log.mock.calls[0][0]).toContain('VITE_USE_MOCK=none')
  })

  it('gõ sai tên nhóm thì cảnh báo thay vì im lặng gọi backend thật', () => {
    vi.stubEnv('VITE_USE_MOCK', 'game,ai;sessions')
    resetMockWarning()
    const log = vi.fn()

    warnMockMode(log)

    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0][0]).toContain('game, ai;sessions')
    expect(log.mock.calls[0][0]).toContain('games, editor')
  })

  it('không cảnh báo khi không có nhóm nào mô phỏng', () => {
    vi.stubEnv('VITE_USE_MOCK', 'none')
    resetMockWarning()
    const log = vi.fn()

    warnMockMode(log)

    expect(log).not.toHaveBeenCalled()
  })
})
