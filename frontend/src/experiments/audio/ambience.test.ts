import { describe, expect, it, vi } from 'vitest'
import { Ambience, AMBIENCE_FADE_SECONDS, AMBIENCE_LEVELS, BIRD_GAP_MS, panForX, WIND_SWELL_MS, type AmbienceGraph } from './ambience'
import { AudioService } from './audioService'
import { FakeAudioContext } from './fakeAudioContext'
import { MAX_PEAK } from './tones'

/** Hẹn giờ giả: chạy tay theo mốc thời gian, để test lịch chim/gió mà không chờ thật. */
function fakeTimers() {
  let now = 0
  let nextId = 1
  const pending = new Map<number, { at: number; callback: () => void }>()
  return {
    setTimer: (callback: () => void, ms: number) => {
      const id = nextId++
      pending.set(id, { at: now + ms, callback })
      return id
    },
    clearTimer: (handle: unknown) => void pending.delete(handle as number),
    advance(ms: number) {
      const target = now + ms
      for (;;) {
        const due = [...pending.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
        if (!due) break
        pending.delete(due[0])
        now = due[1].at
        due[1].callback()
      }
      now = target
    },
    get count() {
      return pending.size
    },
  }
}

function setup(options: { running?: boolean; random?: () => number } = {}) {
  const context = new FakeAudioContext(options.running === false ? { initialState: 'suspended', resumeTo: 'suspended' } : { initialState: 'running' })
  const service = new AudioService({ createContext: () => context })
  void service.unlock()
  const timers = fakeTimers()
  const ambience = new Ambience({ getGraph: () => service.getGraph(), random: options.random ?? (() => 0.5), setTimer: timers.setTimer, clearTimer: timers.clearTimer })
  return { context, service, timers, ambience }
}

describe('panForX', () => {
  it('trái -0,8, giữa 0, phải +0,8, tuyến tính; ngoài khoảng thì kẹp; không hợp lệ thì 0', () => {
    expect(panForX(72, 72, 728)).toBeCloseTo(-0.8, 10)
    expect(panForX(400, 72, 728)).toBeCloseTo(0, 10)
    expect(panForX(728, 72, 728)).toBeCloseTo(0.8, 10)
    expect(panForX(0, 72, 728)).toBeCloseTo(-0.8, 10)
    expect(panForX(5000, 72, 728)).toBeCloseTo(0.8, 10)
    expect(panForX(236, 72, 728)).toBeLessThan(panForX(564, 72, 728))
    expect(panForX(Number.NaN, 72, 728)).toBe(0)
    expect(panForX(100, 50, 50)).toBe(0)
  })
})

describe('Ambience', () => {
  it('mức của từng lớp thấp hơn nhiều trần biên độ của một nốt (không bao giờ át tiếng nhạc, không chói tai)', () => {
    for (const level of Object.values(AMBIENCE_LEVELS)) {
      expect(level).toBeGreaterThan(0)
      expect(level).toBeLessThan(MAX_PEAK / 4)
    }
    expect(AMBIENCE_LEVELS.windQuiet).toBeLessThan(AMBIENCE_LEVELS.wind)
  })

  it('chưa mở khóa âm thanh thì không bật được và không dựng nút nào (không tự tạo AudioContext)', () => {
    const { ambience, context } = setup({ running: false })
    expect(ambience.start()).toBe(false)
    expect(ambience.isRunning).toBe(false)
    expect(context.sources).toHaveLength(0)
    expect(context.oscillators).toHaveLength(0)
  })

  it('đã mở khóa: dựng gió (nhiễu lặp, lọc thấp) và ong vo ve (hai sóng lệch nhau, lọc thấp, im lúc đầu, qua bộ cân trái/phải), vào dần trong AMBIENCE_FADE_SECONDS', async () => {
    const { ambience, context } = setup()
    await Promise.resolve()
    expect(ambience.start()).toBe(true)
    expect(ambience.isRunning).toBe(true)
    expect(context.sources).toHaveLength(1)
    expect(context.sources[0].loop).toBe(true)
    expect(context.sources[0].startedAt).not.toBeNull()
    const noise = context.sources[0].buffer!.getChannelData(0)
    expect(noise.length).toBeGreaterThan(0)
    expect(Math.max(...noise)).toBeLessThanOrEqual(0.5)
    expect(Math.min(...noise)).toBeGreaterThanOrEqual(-0.5)
    expect(context.filters).toHaveLength(2)
    expect(context.filters.every((filter) => filter.type === 'lowpass')).toBe(true)
    expect(context.oscillators).toHaveLength(2)
    const [a, b] = context.oscillators
    expect(a.frequency.value).not.toBe(b.frequency.value) // lệch nhau vài Hz: nghe vo vo
    expect(Math.abs(a.frequency.value - b.frequency.value)).toBeLessThan(15)
    expect(context.panners).toHaveLength(1)
    const buzzGain = context.gains.find((gain) => gain.connections.includes(context.panners[0]))!
    expect(buzzGain.gain.value).toBe(0) // im cho tới khi ong bay
    const bus = context.gains.find((gain) => gain.gain.events.some((event) => event.kind === 'ramp' && event.value === 1))!
    const fade = bus.gain.events.find((event) => event.kind === 'ramp' && event.value === 1)!
    expect(fade.time - context.currentTime).toBeCloseTo(AMBIENCE_FADE_SECONDS, 5)
  })

  it('gọi start() lần nữa khi đang chạy không dựng thêm nút', async () => {
    const { ambience, context } = setup()
    await Promise.resolve()
    ambience.start()
    const count = context.oscillators.length + context.sources.length
    expect(ambience.start()).toBe(true)
    expect(context.oscillators.length + context.sources.length).toBe(count)
  })

  it('follow: ong bay thì tiếng vo ve lên tới mức buzz, ngừng bay thì tắt dần; chỉ đặt lại khi đổi trạng thái', async () => {
    const { ambience, context } = setup()
    await Promise.resolve()
    ambience.start()
    const buzzGain = context.gains.find((gain) => gain.connections.includes(context.panners[0]))!
    ambience.follow(true, 0)
    expect(buzzGain.gain.value).toBe(AMBIENCE_LEVELS.buzz)
    const events = buzzGain.gain.events.length
    ambience.follow(true, 0)
    ambience.follow(true, 0)
    expect(buzzGain.gain.events.length).toBe(events) // không chất lịch thừa mỗi khung hình
    ambience.follow(false, 0)
    expect(buzzGain.gain.value).toBe(0)
  })

  it('follow: cân bằng trái/phải theo vị trí, kẹp trong [-1, 1], chỉ đổi khi lệch đáng kể; giá trị lạ coi là giữa', async () => {
    const { ambience, context } = setup()
    await Promise.resolve()
    ambience.start()
    const panner = context.panners[0]
    ambience.follow(true, -0.8)
    expect(panner.pan.value).toBeCloseTo(-0.8, 10)
    const events = panner.pan.events.length
    ambience.follow(true, -0.79) // lệch rất nhỏ: bỏ qua
    expect(panner.pan.events.length).toBe(events)
    ambience.follow(true, 0.8)
    expect(panner.pan.value).toBeCloseTo(0.8, 10)
    ambience.follow(true, 9)
    expect(panner.pan.value).toBe(1)
    ambience.follow(true, Number.NaN)
    expect(panner.pan.value).toBe(0)
  })

  it('follow khi chưa chạy thì không làm gì và không ném lỗi', () => {
    const { ambience } = setup({ running: false })
    expect(() => ambience.follow(true, 0.5)).not.toThrow()
  })

  it('thỉnh thoảng có tiếng chim (một hoặc hai nốt lướt lên, ngắn, nhỏ), cách nhau trong BIRD_GAP_MS; gió đổi mức theo WIND_SWELL_MS', async () => {
    const { ambience, context, timers } = setup()
    await Promise.resolve()
    ambience.start()
    const base = context.oscillators.length
    timers.advance(BIRD_GAP_MS.min - 1)
    const early = context.oscillators.length
    timers.advance(BIRD_GAP_MS.max + 1)
    const afterFirst = context.oscillators.length
    expect(afterFirst).toBeGreaterThan(early)
    expect(afterFirst - base).toBeGreaterThanOrEqual(1)
    const chirps = context.oscillators.slice(base)
    for (const chirp of chirps) {
      expect(chirp.type).toBe('sine')
      expect(chirp.stoppedAt! - chirp.startedAt!).toBeLessThan(0.3) // ngắn
      expect(chirp.frequency.events.length).toBeGreaterThan(1) // lướt lên rồi xuống nhẹ
    }
    timers.advance(60_000)
    expect(context.oscillators.length).toBeGreaterThan(afterFirst) // tiếp tục thỉnh thoảng
    const wind = context.gains.find((gain) => gain.gain.events.length > 0 && gain.connections.length > 0 && gain.gain.value > 0 && gain.gain.value <= AMBIENCE_LEVELS.wind)
    expect(wind).toBeTruthy()
    expect(WIND_SWELL_MS.min).toBeLessThan(WIND_SWELL_MS.max)
  })

  it('đỉnh biên độ của tiếng chim ≤ mức birds (nhỏ)', async () => {
    const { ambience, context, timers } = setup()
    await Promise.resolve()
    ambience.start()
    timers.advance(BIRD_GAP_MS.max + 1)
    const peaks = context.gains.flatMap((gain) => gain.gain.events.filter((event) => event.kind === 'ramp').map((event) => event.value))
    for (const peak of peaks) expect(peak).toBeLessThanOrEqual(1)
    const chirpGains = context.gains.filter((gain) => gain.gain.events.some((event) => event.value === AMBIENCE_LEVELS.birds))
    expect(chirpGains.length).toBeGreaterThan(0)
  })

  it('tạm dừng (tab bị ẩn): hạ âm nền về 0 và không phát chim; tiếp tục thì lên lại', async () => {
    const { ambience, context, timers } = setup()
    await Promise.resolve()
    ambience.start()
    const bus = context.gains.find((gain) => gain.connections.includes(context.destination) === false && gain.gain.events.some((event) => event.value === 1))!
    ambience.setPaused(true)
    expect(bus.gain.value).toBe(0)
    const before = context.oscillators.length
    timers.advance(BIRD_GAP_MS.max * 3)
    expect(context.oscillators.length).toBe(before) // không có chim lúc tạm dừng
    ambience.setPaused(false)
    expect(bus.gain.value).toBe(1)
  })

  it('stop(): hủy mọi hẹn giờ, dừng nguồn, ngắt nút; sau đó không còn chim; bật lại được', async () => {
    const { ambience, context, timers } = setup()
    await Promise.resolve()
    ambience.start()
    expect(timers.count).toBeGreaterThan(0)
    ambience.stop()
    expect(ambience.isRunning).toBe(false)
    expect(timers.count).toBe(0)
    expect(context.sources[0].stoppedAt).not.toBeNull()
    expect(context.oscillators.slice(0, 2).every((oscillator) => oscillator.stoppedAt !== null)).toBe(true)
    const count = context.oscillators.length
    timers.advance(BIRD_GAP_MS.max * 4)
    expect(context.oscillators.length).toBe(count)
    ambience.stop() // gọi lại không sao
    expect(ambience.start()).toBe(true)
  })

  it('context bị thay (generation đổi): start() dựng lại trên context mới, bỏ cái cũ', async () => {
    const first = new FakeAudioContext({ initialState: 'running' })
    const second = new FakeAudioContext({ initialState: 'running' })
    let graph: AmbienceGraph | null = { context: first, master: first.createGain(), generation: 1 }
    const timers = fakeTimers()
    const ambience = new Ambience({ getGraph: () => graph, setTimer: timers.setTimer, clearTimer: timers.clearTimer })
    ambience.start()
    expect(first.sources).toHaveLength(1)
    graph = { context: second, master: second.createGain(), generation: 2 }
    expect(ambience.start()).toBe(true)
    expect(first.sources[0].stoppedAt).not.toBeNull()
    expect(second.sources).toHaveLength(1)
  })
})

describe('AudioService.getGraph', () => {
  it('chỉ trả đồ thị khi context đang chạy; master dùng chung (nên tắt tiếng áp dụng luôn cho âm nền)', async () => {
    const context = new FakeAudioContext({ initialState: 'suspended' })
    const service = new AudioService({ createContext: () => context })
    expect(service.getGraph()).toBeNull()
    await service.unlock()
    const graph = service.getGraph()!
    expect(graph.context).toBe(context)
    expect(service.getGraph()!.master).toBe(graph.master)
    service.setMuted(true)
    expect(graph.master.gain.value).toBe(0)
    await service.dispose()
    expect(service.getGraph()).toBeNull()
  })
})

describe('Ambience: hẹn giờ thật', () => {
  it('dùng setTimeout/clearTimeout mặc định khi không truyền hẹn giờ', async () => {
    vi.useFakeTimers()
    try {
      const context = new FakeAudioContext({ initialState: 'running' })
      const service = new AudioService({ createContext: () => context })
      await service.unlock()
      const ambience = new Ambience({ getGraph: () => service.getGraph(), random: () => 0 })
      ambience.start()
      const base = context.oscillators.length
      vi.advanceTimersByTime(BIRD_GAP_MS.min + 10)
      expect(context.oscillators.length).toBeGreaterThan(base)
      ambience.stop()
      const count = context.oscillators.length
      vi.advanceTimersByTime(60_000)
      expect(context.oscillators.length).toBe(count)
    } finally {
      vi.useRealTimers()
    }
  })
})
