import { describe, expect, it } from 'vitest'
import {
  COUNT_NOTES_MIDI,
  COUNT_SOUND_NAMES,
  countSoundName,
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

describe('nốt đếm (chú ong bay qua từng bông hoa)', () => {
  it('có 11 nốt, đi lên dần, mỗi nốt một cao độ khác nhau', () => {
    expect(COUNT_SOUND_NAMES).toHaveLength(11)
    expect(COUNT_NOTES_MIDI).toHaveLength(COUNT_SOUND_NAMES.length)
    const freqs = COUNT_SOUND_NAMES.map((name) => soundPlan(name)[0].freq)
    expect(freqs).toEqual([...freqs].sort((a, b) => a - b))
    expect(new Set(freqs).size).toBe(11)
    expect(freqs[0]).toBeCloseTo(midiToFreq(60), 5)
    expect(freqs[10]).toBeCloseTo(midiToFreq(84), 5)
  })

  describe.each(COUNT_SOUND_NAMES)('nốt %s: cùng giới hạn an toàn cho trẻ nhỏ', (name) => {
    const plan = soundPlan(name)
    it('một nốt, biên độ ≤ trần, tần số trong dải dễ chịu, sóng mềm, ngắn', () => {
      expect(plan).toHaveLength(1)
      expect(plan[0].peak).toBeGreaterThan(0)
      expect(plan[0].peak).toBeLessThanOrEqual(MAX_PEAK)
      expect(plan[0].freq).toBeGreaterThanOrEqual(MIN_FREQ)
      expect(plan[0].freq).toBeLessThanOrEqual(MAX_FREQ)
      expect(['sine', 'triangle']).toContain(plan[0].type)
      expect(soundDuration(plan)).toBeLessThanOrEqual(0.5) // ngắn hơn một bước bay của ong, để các nốt không dính nhau
      expect(plan[0].start).toBe(0)
    })
  })

  it('countSoundName: thang tối đa 11 vạch dùng nốt cùng số thứ tự; kẹp ngoài thang', () => {
    for (let index = 0; index <= 10; index += 1) expect(countSoundName(index, 11)).toBe(`count${index}`)
    expect(countSoundName(0, 6)).toBe('count0')
    expect(countSoundName(5, 6)).toBe('count5')
    expect(countSoundName(-3, 11)).toBe('count0')
    expect(countSoundName(99, 11)).toBe('count10')
    expect(countSoundName(2.4, 11)).toBe('count2')
  })

  it('countSoundName: thang dài (21 vạch) dàn đều lên 11 nốt, vẫn đi lên và chạm nốt cao nhất ở vạch cuối', () => {
    const names = Array.from({ length: 21 }, (_, index) => Number(countSoundName(index, 21).replace('count', '')))
    expect(names).toEqual([...names].sort((a, b) => a - b))
    expect(names[0]).toBe(0)
    expect(names[20]).toBe(10)
    expect(new Set(names).size).toBe(11)
  })

  it('countSoundName: dữ liệu lạ (NaN, thang quá ngắn) cho nốt đầu, không ném lỗi', () => {
    expect(countSoundName(Number.NaN, 11)).toBe('count0')
    expect(countSoundName(3, Number.NaN)).toBe('count0')
    expect(countSoundName(3, 1)).toBe('count0')
  })

  it('SOUND_NAMES (âm phản hồi) không bị lẫn nốt đếm', () => {
    for (const name of COUNT_SOUND_NAMES) expect(SOUND_NAMES as readonly string[]).not.toContain(name)
  })
})
