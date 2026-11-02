import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSession, loadSession, saveProgress, saveSession } from './sessionStore'

const session = { sessionId: 's1', participantId: 'p1', nickname: 'Sao Băng' }

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

describe('sessionStore', () => {
  it('lưu rồi đọc lại theo mã chia sẻ; mã khác không thấy', () => {
    saveSession('ABC123', session)

    expect(loadSession('ABC123')).toEqual(session)
    expect(loadSession('XYZ789')).toBeNull()
  })

  it('clearSession xóa phiên', () => {
    saveSession('ABC123', session)
    clearSession('ABC123')

    expect(loadSession('ABC123')).toBeNull()
  })

  it.each([
    ['không phải JSON', '{oops'],
    ['null', 'null'],
    ['số', '5'],
    ['thiếu trường', JSON.stringify({ sessionId: 's1' })],
    ['sai kiểu', JSON.stringify({ sessionId: 1, participantId: 'p', nickname: 'n' })],
    ['chuỗi rỗng', JSON.stringify({ sessionId: '', participantId: 'p', nickname: 'n' })],
  ])('dữ liệu hỏng (%s) -> null', (_name, raw) => {
    sessionStorage.setItem('player:session:ABC123', raw)

    expect(loadSession('ABC123')).toBeNull()
  })

  it('storage ném lỗi: không ném ra ngoài, đọc ra null', () => {
    const boom = () => {
      throw new Error('blocked')
    }

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom)
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom)

    expect(() => saveSession('ABC123', session)).not.toThrow()
    expect(loadSession('ABC123')).toBeNull()
    expect(() => clearSession('ABC123')).not.toThrow()
  })

  it('mã viết thường hoặc có khoảng trắng là cùng một phiên', () => {
    saveSession('mock 00', session)

    expect(loadSession('MOCK00')).toMatchObject(session)
  })

  it('bộ đếm: lưu sau phiên, đọc lại được; bộ đếm hỏng thì bỏ riêng phần đó', () => {
    saveSession('ABC123', session)
    saveProgress('ABC123', { score: 30, correctCount: 3, streak: 1, bestStreak: 2 })
    expect(loadSession('ABC123')?.progress).toEqual({ score: 30, correctCount: 3, streak: 1, bestStreak: 2 })

    sessionStorage.setItem('player:session:ABC123', JSON.stringify({ ...session, progress: { score: -1, correctCount: 'x' } }))
    expect(loadSession('ABC123')).toMatchObject(session)
    expect(loadSession('ABC123')?.progress).toBeUndefined()
  })

  it('không có phiên đã lưu thì saveProgress không tạo gì', () => {
    saveProgress('NOPE00', { score: 1, correctCount: 1, streak: 1, bestStreak: 1 })

    expect(loadSession('NOPE00')).toBeNull()
  })
})
