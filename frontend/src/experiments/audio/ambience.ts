import type { AudioBufferSourceNodeLike, AudioContextLike, BiquadFilterNodeLike, GainNodeLike, OscillatorNodeLike, StereoPannerNodeLike } from './audioContextTypes'

/**
 * Âm nền «vườn» tổng hợp bằng Web Audio (không dùng file): gió nhẹ (nhiễu lọc thấp, lúc mạnh lúc yếu), thỉnh thoảng một tiếng chim ngắn, và tiếng ong vo ve nhỏ
 * chỉ có khi ong đang bay, cân bằng trái/phải theo vị trí ong (stereo pan). Mọi nút nối vào `master` của `AudioService` nên tắt tiếng, âm lượng và trần biên độ
 * của dịch vụ áp dụng luôn; mức riêng của từng lớp còn thấp hơn nhiều `MAX_PEAK` (xem `AMBIENCE_LEVELS`).
 *
 * Không tự dựng AudioContext: chỉ chạy khi dịch vụ đã mở khóa (sau lần chạm đầu của trẻ). Dọn sạch khi `stop()` (nguồn dừng, nút ngắt, hẹn giờ hủy).
 */
export const AMBIENCE_LEVELS = { wind: 0.03, windQuiet: 0.012, birds: 0.035, buzz: 0.045 } as const
/** Thời gian vào/ra (giây) của cả lớp âm nền: không bật hay tắt đột ngột. */
export const AMBIENCE_FADE_SECONDS = 1
const BUZZ_RAMP_SECONDS = 0.15
const PAN_RAMP_SECONDS = 0.06
const PAN_STEP = 0.03
const NOISE_SECONDS = 1.5
export const BIRD_GAP_MS = { min: 5000, max: 11000 } as const
export const WIND_SWELL_MS = { min: 3500, max: 6500 } as const

/** Cân bằng trái/phải theo vị trí ngang `x` của ong trong khoảng [left, right]: -0,8 ở mép trái, +0,8 ở mép phải (không bao giờ dồn hẳn một tai). */
export function panForX(x: number, left: number, right: number): number {
  if (!Number.isFinite(x) || !(right > left)) return 0
  const t = ((x - left) / (right - left)) * 2 - 1
  return Math.min(1, Math.max(-1, t)) * 0.8
}

export interface AmbienceGraph {
  context: AudioContextLike
  master: GainNodeLike
  generation: number
}

export interface AmbienceDeps {
  getGraph: () => AmbienceGraph | null
  random?: () => number
  setTimer?: (callback: () => void, ms: number) => unknown
  clearTimer?: (handle: unknown) => void
}

interface Running {
  graph: AmbienceGraph
  bus: GainNodeLike
  windGain: GainNodeLike
  buzzGain: GainNodeLike
  panner: StereoPannerNodeLike
  sources: (OscillatorNodeLike | AudioBufferSourceNodeLike)[]
  nodes: { disconnect(): unknown }[]
}

export class Ambience {
  private readonly getGraph: AmbienceDeps['getGraph']
  private readonly random: () => number
  private readonly setTimer: (callback: () => void, ms: number) => unknown
  private readonly clearTimer: (handle: unknown) => void
  private running: Running | null = null
  private timers = new Set<unknown>()
  private paused = false
  private buzzOn = false
  private pan = 0

  constructor({ getGraph, random = Math.random, setTimer = (callback, ms) => setTimeout(callback, ms), clearTimer = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>) }: AmbienceDeps) {
    this.getGraph = getGraph
    this.random = random
    this.setTimer = setTimer
    this.clearTimer = clearTimer
  }

  get isRunning(): boolean {
    return this.running !== null
  }

  /** Bật âm nền. Trả `true` nếu đang chạy (kể cả đã chạy từ trước); `false` nếu chưa mở khóa âm thanh (gọi lại sau khi mở khóa). */
  start(): boolean {
    const graph = this.getGraph()
    if (this.running) {
      if (this.running.graph.generation === graph?.generation) return true
      this.stop() // context đã bị thay: dựng lại trên context mới
    }
    if (!graph) return false
    const { context, master } = graph
    const nodes: Running['nodes'] = []
    const sources: Running['sources'] = []

    const bus = context.createGain()
    bus.gain.value = 0
    bus.connect(master)
    nodes.push(bus)

    // Gió: nhiễu trắng lặp lọc thấp.
    const noise = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * NOISE_SECONDS)), context.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) data[i] = (this.random() * 2 - 1) * 0.5
    const wind = context.createBufferSource()
    wind.buffer = noise
    wind.loop = true
    const windFilter: BiquadFilterNodeLike = context.createBiquadFilter()
    windFilter.type = 'lowpass'
    windFilter.frequency.value = 500
    windFilter.Q.value = 0.7
    const windGain = context.createGain()
    windGain.gain.value = AMBIENCE_LEVELS.wind
    wind.connect(windFilter)
    windFilter.connect(windGain)
    windGain.connect(bus)
    nodes.push(wind, windFilter, windGain)
    sources.push(wind)

    // Ong vo ve: hai sóng răng cưa lệch nhau vài Hz (nghe «vo vo» tự nhiên), lọc thấp mạnh nên rất dịu, im cho tới khi ong bay.
    const buzzFilter = context.createBiquadFilter()
    buzzFilter.type = 'lowpass'
    buzzFilter.frequency.value = 420
    buzzFilter.Q.value = 0.5
    const buzzGain = context.createGain()
    buzzGain.gain.value = 0
    const panner = context.createStereoPanner()
    panner.pan.value = this.pan
    for (const frequency of [176, 183]) {
      const oscillator = context.createOscillator()
      oscillator.type = 'sawtooth'
      oscillator.frequency.value = frequency
      oscillator.connect(buzzFilter)
      nodes.push(oscillator)
      sources.push(oscillator)
    }
    buzzFilter.connect(buzzGain)
    buzzGain.connect(panner)
    panner.connect(bus)
    nodes.push(buzzFilter, buzzGain, panner)

    const now = context.currentTime
    for (const source of sources) source.start(now)
    this.running = { graph, bus, windGain, buzzGain, panner, sources, nodes }
    this.paused = false
    this.applyBus()
    this.scheduleSwell()
    this.scheduleBird()
    return true
  }

  /** Tắt hẳn: hủy hẹn giờ, dừng nguồn, ngắt nút. Gọi lại `start()` được. */
  stop(): void {
    for (const handle of this.timers) this.clearTimer(handle)
    this.timers.clear()
    const running = this.running
    this.running = null
    this.buzzOn = false
    if (!running) return
    const { context } = running.graph
    const now = context.currentTime
    try {
      running.bus.gain.setValueAtTime(running.bus.gain.value, now)
      running.bus.gain.linearRampToValueAtTime(0, now + 0.1)
      for (const source of running.sources) source.stop(now + 0.12)
    } catch {
      // nguồn đã dừng hoặc context đã đóng: bỏ qua
    }
    for (const node of running.nodes) node.disconnect()
  }

  /** Tạm dừng (tab bị ẩn) hoặc tiếp tục: chỉ hạ/nâng âm lượng của lớp nền, không dựng lại nút. */
  setPaused(paused: boolean): void {
    this.paused = paused
    this.applyBus()
  }

  /**
   * Gọi mỗi khung hình khi có ong: ong đang bay thì tiếng vo ve hiện lên, ngừng bay thì tắt dần; `pan` (-1…1) là vị trí trái/phải của ong.
   * Chỉ đặt lại tham số khi có thay đổi đáng kể (không chất hàng nghìn lịch mỗi giây).
   */
  follow(flying: boolean, pan: number): void {
    const running = this.running
    if (!running) return
    const now = running.graph.context.currentTime
    if (flying !== this.buzzOn) {
      this.buzzOn = flying
      running.buzzGain.gain.setValueAtTime(running.buzzGain.gain.value, now)
      running.buzzGain.gain.linearRampToValueAtTime(flying ? AMBIENCE_LEVELS.buzz : 0, now + BUZZ_RAMP_SECONDS)
    }
    const clamped = Math.min(1, Math.max(-1, Number.isFinite(pan) ? pan : 0))
    if (Math.abs(clamped - this.pan) >= PAN_STEP) {
      this.pan = clamped
      running.panner.pan.setValueAtTime(running.panner.pan.value, now)
      running.panner.pan.linearRampToValueAtTime(clamped, now + PAN_RAMP_SECONDS)
    }
  }

  private applyBus() {
    const running = this.running
    if (!running) return
    const now = running.graph.context.currentTime
    running.bus.gain.setValueAtTime(running.bus.gain.value, now)
    running.bus.gain.linearRampToValueAtTime(this.paused ? 0 : 1, now + (this.paused ? 0.1 : AMBIENCE_FADE_SECONDS))
  }

  private after(ms: number, callback: () => void) {
    const handle = this.setTimer(() => {
      this.timers.delete(handle)
      callback()
    }, ms)
    this.timers.add(handle)
  }

  private between(range: { min: number; max: number }) {
    return range.min + this.random() * (range.max - range.min)
  }

  /** Gió lúc mạnh lúc yếu: cứ vài giây chuyển mức từ từ. */
  private scheduleSwell() {
    this.after(this.between(WIND_SWELL_MS), () => {
      const running = this.running
      if (!running) return
      const now = running.graph.context.currentTime
      const target = AMBIENCE_LEVELS.windQuiet + this.random() * (AMBIENCE_LEVELS.wind - AMBIENCE_LEVELS.windQuiet)
      running.windGain.gain.setValueAtTime(running.windGain.gain.value, now)
      running.windGain.gain.linearRampToValueAtTime(target, now + 3)
      this.scheduleSwell()
    })
  }

  /** Thỉnh thoảng một tiếng chim ngắn (một hoặc hai nốt lướt lên), cách nhau ngẫu nhiên vài giây; không phát lúc tạm dừng. */
  private scheduleBird() {
    this.after(this.between(BIRD_GAP_MS), () => {
      const running = this.running
      if (!running) return
      if (!this.paused) this.chirp(running)
      this.scheduleBird()
    })
  }

  private chirp(running: Running) {
    const { context } = running.graph
    const notes = this.random() < 0.5 ? 1 : 2
    const base = 1500 + this.random() * 400
    for (let i = 0; i < notes; i += 1) {
      const start = context.currentTime + 0.02 + i * 0.16
      const oscillator = context.createOscillator()
      const envelope = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(base, start)
      oscillator.frequency.linearRampToValueAtTime(base + 450, start + 0.07)
      oscillator.frequency.linearRampToValueAtTime(base + 250, start + 0.13)
      envelope.gain.setValueAtTime(0, start)
      envelope.gain.linearRampToValueAtTime(AMBIENCE_LEVELS.birds, start + 0.02)
      envelope.gain.linearRampToValueAtTime(0, start + 0.13)
      oscillator.connect(envelope)
      envelope.connect(running.bus)
      oscillator.onended = () => {
        oscillator.disconnect()
        envelope.disconnect()
      }
      oscillator.start(start)
      oscillator.stop(start + 0.15)
    }
  }
}
