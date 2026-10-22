import { describe, expect, it, vi } from 'vitest'
import { CONFETTI_COLORS } from './beeGardenGeometry'
import { confettiBursts, launchConfetti, originOfRect } from './gardenConfetti'

describe('confettiBursts', () => {
  it('đúng một câu: một loạt nhỏ gọn, dùng bảng màu của cảnh, tự tắt khi giảm chuyển động, nằm trên mọi thứ', () => {
    const bursts = confettiBursts('correct', { x: 0.3, y: 0.4 })
    expect(bursts).toHaveLength(2) // đợt chính đặc và đợt rộng tỏa ra hai bên
    expect(bursts.reduce((sum, burst) => sum + (burst.particleCount ?? 0), 0)).toBeGreaterThan(36) // dày hơn bản đầu (36 hạt)
    for (const burst of bursts) {
      expect(burst.particleCount).toBeLessThanOrEqual(50)
      expect(burst.colors).toEqual([...CONFETTI_COLORS])
      expect(burst.disableForReducedMotion).toBe(true)
      expect(burst.zIndex).toBeGreaterThanOrEqual(100)
      expect(burst.origin).toEqual({ x: 0.3, y: 0.4 }) // cả hai đợt cùng bắn từ chỗ hoa được chọn
    }
  })
  it('hoàn thành: ba loạt (hai bên và giữa), lớn hơn, cũng tự tắt khi giảm chuyển động', () => {
    const bursts = confettiBursts('complete')
    expect(bursts).toHaveLength(3)
    expect(bursts.reduce((sum, burst) => sum + (burst.particleCount ?? 0), 0)).toBeGreaterThan(confettiBursts('correct')[0].particleCount ?? 0)
    for (const burst of bursts) expect(burst.disableForReducedMotion).toBe(true)
    expect(bursts[0].origin?.x).toBeLessThan(0.5)
    expect(bursts[1].origin?.x).toBeGreaterThan(0.5)
  })
  it('tâm bắn lấy theo gốc đưa vào và được kẹp trong [0, 1]; không có gốc thì bắn từ giữa phía trên', () => {
    expect(confettiBursts('correct', { x: 0.3, y: 0.4 })[0].origin).toEqual({ x: 0.3, y: 0.4 })
    expect(confettiBursts('correct', { x: -2, y: 9 })[0].origin).toEqual({ x: 0, y: 1 })
    expect(confettiBursts('correct')[0].origin).toEqual({ x: 0.5, y: 0.6 })
  })
})

describe('launchConfetti', () => {
  it('bắn đủ các loạt và trả true', () => {
    const fire = vi.fn()
    expect(launchConfetti('complete', { reducedMotion: false, fire })).toBe(true)
    expect(fire).toHaveBeenCalledTimes(3)
    fire.mockClear()
    expect(launchConfetti('correct', { reducedMotion: false, fire, origin: { x: 0.2, y: 0.5 } })).toBe(true)
    expect(fire).toHaveBeenCalledTimes(2)
    expect(fire.mock.calls[0][0].origin).toEqual({ x: 0.2, y: 0.5 })
    expect(fire.mock.calls[1][0].origin).toEqual({ x: 0.2, y: 0.5 })
  })
  it('giảm chuyển động: không bắn gì và trả false', () => {
    const fire = vi.fn()
    expect(launchConfetti('correct', { reducedMotion: true, fire })).toBe(false)
    expect(launchConfetti('complete', { reducedMotion: true, fire })).toBe(false)
    expect(fire).not.toHaveBeenCalled()
  })
  it('thư viện ném lỗi: nuốt lỗi và trả false (trang trí không được làm hỏng màn chơi)', () => {
    const fire = vi.fn(() => {
      throw new Error('không có canvas')
    })
    expect(launchConfetti('correct', { reducedMotion: false, fire })).toBe(false)
  })
})

describe('originOfRect', () => {
  it('tâm hình chữ nhật hoặc điểm lệch trong nó, đổi sang tỉ lệ của cửa sổ', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1000 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 500 })
    expect(originOfRect({ left: 100, top: 50, width: 400, height: 200 })).toEqual({ x: 0.3, y: 0.3 })
    expect(originOfRect({ left: 100, top: 50, width: 400, height: 200 }, { x: 40, y: 20 })).toEqual({ x: 0.14, y: 0.14 })
  })
  it('không có hình chữ nhật hoặc số không hợp lệ thì undefined', () => {
    expect(originOfRect(undefined)).toBeUndefined()
    expect(originOfRect({ left: Number.NaN, top: 0, width: 1, height: 1 })).toBeUndefined()
  })
})
