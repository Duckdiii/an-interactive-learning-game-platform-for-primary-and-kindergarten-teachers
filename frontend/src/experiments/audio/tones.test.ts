import { describe, expect, it } from 'vitest'
import {
  MAX_FREQ,
  MAX_PEAK,
  MAX_SOUND_SECONDS,
  MIN_FREQ,
  RELEASE_SECONDS,
  SOUND_NAMES,
  midiToFreq,
  soundDuration,
  soundPlan,
} from './tones'

describe('midiToFreq', () => {
  it.each([
    [69, 440],
    [81, 880],
    [57, 220],
    [60, 261.6256],
    [72, 523.2511],
  ])('nốt %i = %f Hz', (midi, hz) => {
    expect(midiToFreq(midi)).toBeCloseTo(hz, 3)
  })

  it('tăng 12 nửa cung thì gấp đôi tần số', () => {
    expect(midiToFreq(76) / midiToFreq(64)).toBeCloseTo(2, 10)
  })
})

describe('kế hoạch âm', () => {
  it('mỗi tên âm đều có kế hoạch không rỗng', () => {
    for (const name of SOUND_NAMES) expect(soundPlan(name).length).toBeGreaterThan(0)
  })

  describe.each(SOUND_NAMES)('âm %s: giới hạn an toàn cho trẻ nhỏ', (name) => {
    const plan = soundPlan(name)

    it('biên độ đỉnh không vượt trần, và lớn hơn 0', () => {
      for (const step of plan) {
        expect(step.peak).toBeGreaterThan(0)
        expect(step.peak).toBeLessThanOrEqual(MAX_PEAK)
      }
    })

    it('tần số trong dải dễ chịu, không chói', () => {
      for (const step of plan) {
        expect(step.freq).toBeGreaterThanOrEqual(MIN_FREQ)
        expect(step.freq).toBeLessThanOrEqual(MAX_FREQ)
      }
    })

    it('ngắn: tổng thời gian không quá giới hạn, mỗi nốt có độ dài dương', () => {
      expect(soundDuration(plan)).toBeLessThanOrEqual(MAX_SOUND_SECONDS)
      for (const step of plan) {
        expect(step.duration).toBeGreaterThan(0)
        expect(step.start).toBeGreaterThanOrEqual(0)
      }
    })

    it('dùng sóng mềm (sine hoặc triangle), không sóng vuông/răng cưa chói tai', () => {
      for (const step of plan) expect(['sine', 'triangle']).toContain(step.type)
    })

    it('các nốt xếp theo thứ tự thời gian', () => {
      const starts = plan.map((step) => step.start)
      expect(starts).toEqual([...starts].sort((a, b) => a - b))
    })
  })

  it('âm đúng: ba nốt đi lên', () => {
    const freqs = soundPlan('correct').map((step) => step.freq)
    expect(freqs).toHaveLength(3)
    expect(freqs).toEqual([...freqs].sort((a, b) => a - b))
  })

  it('âm thử lại: hai nốt đi xuống nhẹ và nhỏ hơn âm đúng (không phạt)', () => {
    const tryAgain = soundPlan('tryAgain')
    const correct = soundPlan('correct')
    expect(tryAgain).toHaveLength(2)
    expect(tryAgain[1].freq).toBeLessThan(tryAgain[0].freq)
    expect(Math.max(...tryAgain.map((s) => s.peak))).toBeLessThan(Math.min(...correct.map((s) => s.peak)))
  })

  it('âm hoàn thành: bốn nốt đi lên, nốt cuối dài nhất', () => {
    const plan = soundPlan('complete')
    expect(plan).toHaveLength(4)
    const freqs = plan.map((step) => step.freq)
    expect(freqs).toEqual([...freqs].sort((a, b) => a - b))
    expect(plan[3].duration).toBe(Math.max(...plan.map((s) => s.duration)))
  })

  it('soundDuration = hết nốt cuối cùng + đoạn tắt', () => {
    const plan = soundPlan('correct')
    const lastEnd = Math.max(...plan.map((s) => s.start + s.duration))
    expect(soundDuration(plan)).toBeCloseTo(lastEnd + RELEASE_SECONDS, 10)
    expect(soundDuration([])).toBeCloseTo(RELEASE_SECONDS, 10)
  })
})
