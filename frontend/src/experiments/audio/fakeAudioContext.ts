import type {
  AudioBufferLike,
  AudioBufferSourceNodeLike,
  BiquadFilterNodeLike,
  StereoPannerNodeLike,
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
  GainNodeLike,
  OscillatorNodeLike,
} from './audioContextTypes'

export interface ParamEvent {
  kind: 'set' | 'ramp'
  value: number
  time: number
}

/**
 * Tham số giả. Đơn giản hóa: đường dốc coi như hoàn tất ngay (`value` nhảy tới đích) để test đọc được giá trị
 * cuối; bản thân lịch (`events`) mới là thứ chứng minh tiếng không bị "tách". Âm thật phải nghe bằng tai.
 */
export class FakeParam implements AudioParamLike {
  value = 0
  readonly events: ParamEvent[] = []
  setValueAtTime(value: number, time: number) {
    this.events.push({ kind: 'set', value, time })
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.events.push({ kind: 'ramp', value, time })
    this.value = value
  }
}

class FakeNode implements AudioNodeLike {
  readonly connections: AudioNodeLike[] = []
  disconnected = false
  connect(destination: AudioNodeLike) {
    this.connections.push(destination)
  }
  disconnect() {
    this.disconnected = true
  }
}

export class FakeGain extends FakeNode implements GainNodeLike {
  readonly gain = new FakeParam()
}

export class FakeOscillator extends FakeNode implements OscillatorNodeLike {
  type: OscillatorType = 'sine'
  readonly frequency = new FakeParam()
  onended: ((event: Event) => unknown) | null = null
  startedAt: number | null = null
  stoppedAt: number | null = null
  start(when = 0) {
    this.startedAt = when
  }
  stop(when = 0) {
    this.stoppedAt = when
  }
  /** Test gọi để giả lập nốt phát xong. */
  finish() {
    this.onended?.(new Event('ended'))
  }
}

export class FakeStereoPanner extends FakeNode implements StereoPannerNodeLike {
  readonly pan = new FakeParam()
}

export class FakeBiquad extends FakeNode implements BiquadFilterNodeLike {
  type: BiquadFilterType = 'lowpass'
  readonly frequency = new FakeParam()
  readonly Q = new FakeParam()
}

export class FakeBuffer implements AudioBufferLike {
  readonly data: Float32Array
  constructor(length: number) {
    this.data = new Float32Array(length)
  }
  getChannelData() {
    return this.data
  }
}

export class FakeBufferSource extends FakeNode implements AudioBufferSourceNodeLike {
  buffer: AudioBufferLike | null = null
  loop = false
  startedAt: number | null = null
  stoppedAt: number | null = null
  start(when = 0) {
    this.startedAt = when
  }
  stop(when = 0) {
    this.stoppedAt = when
  }
}

export interface FakeContextOptions {
  /** Trạng thái ban đầu và trạng thái sau `resume()`: mặc định 'suspended' rồi 'running'. */
  initialState?: string
  resumeTo?: string
  resumeRejects?: boolean
  /** true: `resume()` treo tới khi test gọi `releaseResume()` (để dựng điều kiện đua). */
  deferResume?: boolean
}

/** AudioContext giả cho test: ghi lại mọi nút được dựng và lịch envelope. */
export class FakeAudioContext implements AudioContextLike {
  state: string
  currentTime = 10
  readonly destination: AudioNodeLike = new FakeNode()
  readonly sampleRate = 8000
  readonly oscillators: FakeOscillator[] = []
  readonly gains: FakeGain[] = []
  readonly panners: FakeStereoPanner[] = []
  readonly filters: FakeBiquad[] = []
  readonly sources: FakeBufferSource[] = []
  resumeCalls = 0
  closeCalls = 0
  /** Test đổi giữa chừng để giả lập "resume bị từ chối rồi sau đó được". */
  resumeRejects: boolean
  private readonly resumeTo: string
  private readonly deferResume: boolean
  private releaseFn: (() => void) | null = null

  constructor(options: FakeContextOptions = {}) {
    this.state = options.initialState ?? 'suspended'
    this.resumeTo = options.resumeTo ?? 'running'
    this.resumeRejects = options.resumeRejects ?? false
    this.deferResume = options.deferResume ?? false
  }

  async resume() {
    this.resumeCalls += 1
    if (this.deferResume) {
      await new Promise<void>((resolve) => {
        this.releaseFn = resolve
      })
    }
    if (this.resumeRejects) throw new Error('resume bị từ chối')
    this.state = this.resumeTo
  }

  /** Cho `resume()` đang treo (nếu có) chạy tiếp. */
  releaseResume() {
    this.releaseFn?.()
    this.releaseFn = null
  }

  async close() {
    this.closeCalls += 1
    this.state = 'closed'
  }

  createGain() {
    const gain = new FakeGain()
    this.gains.push(gain)
    return gain
  }

  createOscillator() {
    const oscillator = new FakeOscillator()
    this.oscillators.push(oscillator)
    return oscillator
  }

  createStereoPanner() {
    const panner = new FakeStereoPanner()
    this.panners.push(panner)
    return panner
  }

  createBiquadFilter() {
    const filter = new FakeBiquad()
    this.filters.push(filter)
    return filter
  }

  createBuffer(_channels: number, length: number) {
    return new FakeBuffer(length)
  }

  createBufferSource() {
    const source = new FakeBufferSource()
    this.sources.push(source)
    return source
  }
}
