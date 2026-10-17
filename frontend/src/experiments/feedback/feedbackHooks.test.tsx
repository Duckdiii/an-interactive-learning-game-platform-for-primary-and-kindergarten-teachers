import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AudioService } from '../audio/audioService'
import { buildPlan, MIN_RETRIGGER_SECONDS, type FeedbackPlan } from './feedbackEffects'
import { useExperimentFeedback } from './useExperimentFeedback'
import { makeClock } from './fakeClock'
import { useFeedbackTimeline } from './useFeedbackTimeline'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

describe('useFeedbackTimeline', () => {
  const correct = buildPlan('correct')

  it('chưa có kế hoạch hoặc runId = 0 thì không có gì để vẽ và không xếp khung nào', () => {
    const { clock, pending } = makeClock()
    expect(renderHook(() => useFeedbackTimeline(null, 1, clock)).result.current).toBeNull()
    expect(renderHook(() => useFeedbackTimeline(correct, 0, clock)).result.current).toBeNull()
    expect(pending()).toBe(0)
  })

  it('chạy theo thời gian: lấy mẫu tại từng khung rồi dừng khi hết duration', () => {
    const { clock, advance, pending } = makeClock()
    const { result } = renderHook(() => useFeedbackTimeline(correct, 1, clock))
    expect(result.current).toMatchObject({ active: true, scale: 1, opacity: 0 })
    expect(pending()).toBe(1)

    advance(180)
    expect(result.current!.scale).toBeCloseTo(1.1, 10)
    advance(300)
    expect(result.current!.active).toBe(true)

    advance(1000) // quá 0,9s
    expect(result.current!.active).toBe(false)
    expect(pending()).toBe(0) // không còn vòng lặp nền
  })

  it('runId đổi thì chạy lại từ đầu dù kế hoạch giữ nguyên', () => {
    const { clock, advance } = makeClock()
    const { result, rerender } = renderHook(({ runId }) => useFeedbackTimeline(correct, runId, clock), {
      initialProps: { runId: 1 },
    })
    advance(180)
    expect(result.current!.scale).toBeCloseTo(1.1, 10)
    rerender({ runId: 2 })
    expect(result.current).toMatchObject({ active: true, scale: 1, opacity: 0 }) // t = 0 của lần chạy mới
    advance(180)
    expect(result.current!.scale).toBeCloseTo(1.1, 10)
  })

  it('gỡ component thì hủy khung đang chờ', () => {
    const { clock, pending } = makeClock()
    const { unmount } = renderHook(() => useFeedbackTimeline(correct, 1, clock))
    expect(pending()).toBe(1)
    unmount()
    expect(pending()).toBe(0)
  })

  it('đổi kế hoạch (cùng runId) thì hủy lần chạy cũ và chạy kế hoạch mới', () => {
    const { clock, pending } = makeClock()
    const { result, rerender } = renderHook(({ plan }) => useFeedbackTimeline(plan, 1, clock), {
      initialProps: { plan: correct as FeedbackPlan },
    })
    rerender({ plan: buildPlan('tryAgain') })
    expect(pending()).toBe(1) // chỉ một vòng lặp
    expect(result.current).toMatchObject({ active: true })
  })

  it('kế hoạch dựng mới mỗi lần render (cùng nội dung) không khởi động lại hiệu ứng và không lặp vô hạn', () => {
    const { clock, advance, pending } = makeClock()
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      return useFeedbackTimeline(buildPlan('correct'), 1, clock) // danh tính mới ở mỗi lần render
    })
    advance(180)
    expect(result.current!.scale).toBeCloseTo(1.1, 10) // thời gian vẫn chạy tiếp, không về 0
    expect(pending()).toBe(1)
    expect(renders).toBeLessThan(10)
  })

  it('kế hoạch khác nội dung thì chạy lại (đổi loại phản hồi giữa chừng)', () => {
    const { clock, advance } = makeClock()
    const { result, rerender } = renderHook(({ kind }) => useFeedbackTimeline(buildPlan(kind), 1, clock), {
      initialProps: { kind: 'correct' as 'correct' | 'tryAgain' },
    })
    advance(180)
    rerender({ kind: 'tryAgain' })
    expect(result.current).toMatchObject({ active: true, offsetX: 0, opacity: 0 }) // bắt đầu lại từ t = 0
  })

  it('kế hoạch về null giữa chừng thì hủy vòng lặp và không vẽ gì', () => {
    const { clock, pending } = makeClock()
    const { result, rerender } = renderHook(({ plan }) => useFeedbackTimeline(plan, 1, clock), {
      initialProps: { plan: correct as FeedbackPlan | null },
    })
    expect(pending()).toBe(1)
    rerender({ plan: null })
    expect(result.current).toBeNull()
    expect(pending()).toBe(0)
  })

  it('bật giảm chuyển động giữa lúc đang chạy thì chuyển sang kế hoạch tĩnh từ đầu, chỉ một vòng lặp', () => {
    const { clock, advance, pending } = makeClock()
    const { result, rerender } = renderHook(({ reduced }) => useFeedbackTimeline(buildPlan('correct', { reducedMotion: reduced }), 1, clock), {
      initialProps: { reduced: false },
    })
    advance(180)
    expect(result.current!.scale).toBeCloseTo(1.1, 10)
    rerender({ reduced: true })
    expect(result.current).toMatchObject({ active: true, opacity: 1, scale: 1 })
    expect(pending()).toBe(1)
  })

  it('kế hoạch giảm chuyển động: vòng sáng tĩnh trong đúng 0,8s rồi tắt', () => {
    const { clock, advance } = makeClock()
    const { result } = renderHook(() => useFeedbackTimeline(buildPlan('correct', { reducedMotion: true }), 1, clock))
    expect(result.current).toMatchObject({ active: true, opacity: 1, scale: 1 })
    advance(790)
    expect(result.current!.opacity).toBe(1)
    advance(20)
    expect(result.current!.active).toBe(false)
  })
})

describe('usePrefersReducedMotion', () => {
  const original = window.matchMedia
  afterEach(() => {
    window.matchMedia = original
  })

  it('không có matchMedia (jsdom) thì coi là chưa bật', () => {
    // @ts-expect-error mô phỏng môi trường không hỗ trợ
    window.matchMedia = undefined
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(false)
  })

  it('theo cài đặt hệ điều hành và cập nhật khi người dùng đổi', () => {
    const listeners = new Set<() => void>()
    let matches = true
    window.matchMedia = vi.fn(() => ({
      get matches() {
        return matches
      },
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })) as unknown as typeof window.matchMedia

    const { result, unmount } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(true)
    matches = false
    act(() => listeners.forEach((listener) => listener()))
    expect(result.current).toBe(false)
    unmount()
    expect(listeners.size).toBe(0) // gỡ trình nghe khi rời
  })
})

describe('useExperimentFeedback', () => {
  const fakeAudio = () => {
    const audio = { unlock: vi.fn(async () => true), play: vi.fn(() => true) }
    return { audio, service: audio as unknown as AudioService }
  }

  it('ban đầu chưa phát gì', () => {
    const { service } = fakeAudio()
    const { result } = renderHook(() => useExperimentFeedback({ audio: service }))
    expect(result.current).toMatchObject({ kind: null, runId: 0, plan: null })
  })

  it.each([
    ['correct', 'correct'],
    ['tryAgain', 'tryAgain'],
    ['complete', 'complete'],
  ] as const)('trigger(%s): mở khóa âm thanh, phát âm %s, tăng runId, dựng kế hoạch', (kind, sound) => {
    const { audio, service } = fakeAudio()
    const { result } = renderHook(() => useExperimentFeedback({ audio: service }))
    act(() => result.current.trigger(kind))
    expect(audio.unlock).toHaveBeenCalledTimes(1)
    expect(audio.play).toHaveBeenCalledWith(sound)
    expect(result.current).toMatchObject({ kind, runId: 1 })
    expect(result.current.plan).toEqual(buildPlan(kind))
  })

  it('mỗi lần trigger (cách nhau đủ xa) tăng runId, kể cả cùng loại (để chạy lại hiệu ứng)', () => {
    const { service } = fakeAudio()
    let time = 0
    const { result } = renderHook(() => useExperimentFeedback({ audio: service, now: () => time }))
    act(() => result.current.trigger('correct'))
    time += MIN_RETRIGGER_SECONDS * 1000
    act(() => result.current.trigger('correct'))
    expect(result.current.runId).toBe(2)
  })

  describe('chạm dồn dập: giới hạn chớp giữa các lần phát (WCAG 2.3.1)', () => {
    const gap = MIN_RETRIGGER_SECONDS * 1000
    const setup = (options: { forceReducedMotion?: boolean } = {}) => {
      const { audio, service } = fakeAudio()
      const clock = { time: 1000 }
      const hook = renderHook(() => useExperimentFeedback({ audio: service, now: () => clock.time, ...options }))
      return { audio, clock, ...hook }
    }

    it('lần chạm đến sớm hơn khoảng tối thiểu bị bỏ phần hình nhưng vẫn phát âm', () => {
      const { audio, clock, result } = setup()
      act(() => result.current.trigger('correct'))
      clock.time += gap - 1
      act(() => result.current.trigger('correct'))
      expect(result.current.runId).toBe(1)
      expect(audio.play).toHaveBeenCalledTimes(2)
    })

    it('đúng khoảng tối thiểu thì được khởi động lại (ranh giới)', () => {
      const { clock, result } = setup()
      act(() => result.current.trigger('correct'))
      clock.time += gap
      act(() => result.current.trigger('correct'))
      expect(result.current.runId).toBe(2)
    })

    it('chạm bốn lần trong một giây chỉ khởi động hiệu ứng hình tối đa hai lần', () => {
      const { clock, result } = setup()
      for (let i = 0; i < 4; i += 1) {
        act(() => result.current.trigger('correct'))
        clock.time += 250
      }
      expect(result.current.runId).toBe(2)
    })

    it('đổi loại phản hồi trong khoảng đó cũng bị bỏ phần hình (không reset vòng sáng)', () => {
      const { clock, result } = setup()
      act(() => result.current.trigger('tryAgain'))
      clock.time += 100
      act(() => result.current.trigger('complete'))
      expect(result.current.kind).toBe('tryAgain')
      expect(result.current.runId).toBe(1)
    })

    it('giảm chuyển động cũng được áp dụng (vòng sáng tĩnh không bật/tắt dồn dập)', () => {
      const { clock, result } = setup({ forceReducedMotion: true })
      act(() => result.current.trigger('correct'))
      clock.time += 100
      act(() => result.current.trigger('correct'))
      expect(result.current.runId).toBe(1)
    })
  })

  it('trigger giữ nguyên danh tính khi render lại (đồng hồ mặc định ổn định)', () => {
    const { service } = fakeAudio()
    const { result, rerender } = renderHook(() => useExperimentFeedback({ audio: service }))
    const first = result.current.trigger
    rerender()
    expect(result.current.trigger).toBe(first)
  })

  it('kế hoạch giữ nguyên danh tính khi render lại mà không có gì đổi', () => {
    const { service } = fakeAudio()
    const { result, rerender } = renderHook(() => useExperimentFeedback({ audio: service }))
    act(() => result.current.trigger('correct'))
    const plan = result.current.plan
    rerender()
    expect(result.current.plan).toBe(plan)
  })

  it('forceReducedMotion: kế hoạch giảm chuyển động nhưng âm thanh vẫn phát', () => {
    const { audio, service } = fakeAudio()
    const { result } = renderHook(() => useExperimentFeedback({ audio: service, forceReducedMotion: true }))
    act(() => result.current.trigger('complete'))
    expect(result.current.reducedMotion).toBe(true)
    expect(result.current.plan).toEqual(buildPlan('complete', { reducedMotion: true }))
    expect(audio.play).toHaveBeenCalledWith('complete')
  })

  it('audio = null: chỉ có hiệu ứng hình, không lỗi', () => {
    const { result } = renderHook(() => useExperimentFeedback({ audio: null }))
    expect(() => act(() => result.current.trigger('correct'))).not.toThrow()
    expect(result.current.runId).toBe(1)
  })

  it('âm thanh đang tắt tiếng (play trả false) vẫn khởi động hiệu ứng hình', () => {
    const audio = { unlock: vi.fn(async () => false), play: vi.fn(() => false) }
    const { result } = renderHook(() => useExperimentFeedback({ audio: audio as unknown as AudioService }))
    act(() => result.current.trigger('tryAgain'))
    expect(result.current.kind).toBe('tryAgain')
  })

  it('theo cài đặt giảm chuyển động của hệ điều hành', () => {
    const original = window.matchMedia
    window.matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    try {
      const { service } = fakeAudio()
      const { result } = renderHook(() => useExperimentFeedback({ audio: service }))
      act(() => result.current.trigger('correct'))
      expect(result.current.reducedMotion).toBe(true)
      expect(result.current.plan?.reducedMotion).toBe(true)
    } finally {
      window.matchMedia = original
    }
  })
})
