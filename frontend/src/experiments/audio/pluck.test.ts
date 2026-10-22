import { describe, expect, it } from 'vitest'
import { AudioService } from './audioService'
import { FakeAudioContext } from './fakeAudioContext'
import { ATTACK_SECONDS, COUNT_NOTES_MIDI, COUNT_SOUND_NAMES, RELEASE_SECONDS, soundPlan } from './tones'

describe('nốt đếm: thang ngũ cung, âm sắc phím gõ', () => {
  it('mỗi số 0 đến 10 ứng một nốt thuộc thang ngũ cung đô trưởng (đô, rê, mi, sol, la), đi lên từng bước', () => {
    const pentatonic = new Set([0, 2, 4, 7, 9])
    for (const midi of COUNT_NOTES_MIDI) expect(pentatonic.has(midi % 12), `midi ${midi}`).toBe(true)
    for (let i = 1; i < COUNT_NOTES_MIDI.length; i += 1) {
      expect(COUNT_NOTES_MIDI[i]).toBeGreaterThan(COUNT_NOTES_MIDI[i - 1])
      expect(COUNT_NOTES_MIDI[i] - COUNT_NOTES_MIDI[i - 1]).toBeLessThanOrEqual(3) // bước liền nhau: không nhảy xa
    }
    expect(COUNT_NOTES_MIDI).toHaveLength(11)
  })
  it('mềm kiểu phím gõ: sóng tam giác với đường biên độ «pluck» (tắt dần, không giữ)', () => {
    for (const name of COUNT_SOUND_NAMES) {
      const [step] = soundPlan(name)
      expect(step.type).toBe('triangle')
      expect(step.shape).toBe('pluck')
    }
  })
  it('đường biên độ pluck: 0 → đỉnh (nhanh) → 0 tại hết duration, KHÔNG có bước giữ; dao động dừng ngay sau đó (không kéo đuôi thêm)', async () => {
    const context = new FakeAudioContext({ initialState: 'running' })
    const service = new AudioService({ createContext: () => context })
    await service.unlock()
    expect(service.play('count3')).toBe(true)
    const [step] = soundPlan('count3')
    const oscillator = context.oscillators[0]
    const envelope = context.gains.find((gain) => gain.gain.events.length > 0 && gain.connections.length > 0 && gain.gain.events.some((event) => event.value === step.peak))!
    const start = oscillator.startedAt!
    const events = envelope.gain.events
    expect(events).toEqual([
      { kind: 'set', value: 0, time: start },
      { kind: 'ramp', value: step.peak, time: start + ATTACK_SECONDS },
      { kind: 'ramp', value: 0, time: start + step.duration },
    ])
    expect(oscillator.stoppedAt!).toBeCloseTo(start + step.duration + 0.02, 10)
    expect(oscillator.stoppedAt! - start).toBeLessThan(step.duration + RELEASE_SECONDS) // ngắn hơn kiểu «giữ + tắt dần»
    expect(oscillator.type).toBe('triangle')
  })
  it('âm đúng, thử lại, hoàn thành vẫn dùng đường «giữ» như cũ (có bước giữ đỉnh)', async () => {
    const context = new FakeAudioContext({ initialState: 'running' })
    const service = new AudioService({ createContext: () => context })
    await service.unlock()
    service.play('correct')
    const [step] = soundPlan('correct')
    const envelope = context.gains.find((gain) => gain.gain.events.some((event) => event.kind === 'set' && event.value === step.peak))
    expect(envelope).toBeTruthy()
    expect(soundPlan('tryAgain').every((item) => item.shape === undefined)).toBe(true)
  })
})
