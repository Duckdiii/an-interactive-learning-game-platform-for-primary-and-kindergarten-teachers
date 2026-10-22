import { describe, expect, it } from 'vitest'
import { readBoolPref, writeBoolPref } from './soundPrefs'

const memory = () => {
  const data = new Map<string, string>()
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value), data }
}

describe('soundPrefs', () => {
  it('đọc lại đúng giá trị đã ghi; chưa có hoặc lạ thì dùng mặc định', () => {
    const store = memory()
    expect(readBoolPref('k', true, store)).toBe(true)
    expect(readBoolPref('k', false, store)).toBe(false)
    writeBoolPref('k', true, store)
    expect(store.data.get('k')).toBe('1')
    expect(readBoolPref('k', false, store)).toBe(true)
    writeBoolPref('k', false, store)
    expect(readBoolPref('k', true, store)).toBe(false)
    store.setItem('k', 'bậy bạ')
    expect(readBoolPref('k', true, store)).toBe(true)
  })
  it('kho bị chặn (ném lỗi) hoặc không có: không ném lỗi, dùng mặc định', () => {
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceeded')
      },
    }
    expect(readBoolPref('k', true, throwing)).toBe(true)
    expect(() => writeBoolPref('k', true, throwing)).not.toThrow()
    expect(readBoolPref('k', false, undefined as never)).toBeDefined()
  })
  it('mặc định dùng sessionStorage thật (jsdom): ghi rồi đọc lại trong cùng phiên', () => {
    writeBoolPref('bee-test-key', true)
    expect(readBoolPref('bee-test-key', false)).toBe(true)
    window.sessionStorage.removeItem('bee-test-key')
  })
})
