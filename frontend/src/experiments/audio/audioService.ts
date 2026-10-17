import type { AudioContextLike, GainNodeLike } from './audioContextTypes'
import { ATTACK_SECONDS, MAX_PEAK, RELEASE_SECONDS, soundPlan, type SoundName } from './tones'

export const DEFAULT_VOLUME = 0.6
/** Số lệnh phát tối đa được giữ khi chưa mở khóa; lệnh cũ nhất bị bỏ khi đầy. */
export const DEFAULT_MAX_QUEUE = 3
/** Lệnh phát chờ quá lâu thì bỏ (âm "đúng" phát sau 5 giây gây nhầm lẫn). */
export const DEFAULT_QUEUE_TTL_MS = 2000
/** Cùng một âm không phát lại trong khoảng này (chống bấm dồn dập thành tràng âm). */
export const DEFAULT_MIN_GAP_MS = 60
/** Số nốt phát cùng lúc tối đa; vượt thì bỏ lệnh mới (chống chồng nốt khi bấm liên tục). */
export const DEFAULT_MAX_ACTIVE_NOTES = 8
/**
 * Hệ số chừa khoảng trống ở master: trường hợp xấu nhất (mọi nốt đang phát cùng đạt đỉnh) có tổng biên độ
 * `maxActiveNotes × MAX_PEAK × MASTER_HEADROOM` ≤ 1, nên không bị cắt đỉnh (méo tiếng) kể cả khi âm lượng = 1.
 */
export const MASTER_HEADROOM = 0.5
/** Độ trễ nhỏ giữa "bây giờ" và lúc nốt đầu bắt đầu, để lịch envelope kịp áp dụng. */
const START_LEAD_SECONDS = 0.02
/** Đổi âm lượng/tắt tiếng bằng đường dốc ngắn (giây) để không nghe tiếng "tách". */
const GAIN_RAMP_SECONDS = 0.02

export interface AudioServiceOptions {
  /** Dựng AudioContext. Chỉ được gọi lười trong `unlock()` (cần cử chỉ người dùng), không bao giờ lúc import. */
  createContext?: () => AudioContextLike
  now?: () => number
  maxQueue?: number
  queueTtlMs?: number
  minGapMs?: number
  maxActiveNotes?: number
}

export interface AudioSnapshot {
  readonly muted: boolean
  readonly volume: number
  readonly unlocked: boolean
}

/** Tổng hợp âm phản hồi bằng Web Audio, không dùng file âm thanh nào. */
export class AudioService {
  private readonly createContext: () => AudioContextLike
  private readonly now: () => number
  private readonly maxQueue: number
  private readonly queueTtlMs: number
  private readonly minGapMs: number
  private readonly maxActiveNotes: number

  private context: AudioContextLike | null = null
  private master: GainNodeLike | null = null
  private muted = false
  private volume = DEFAULT_VOLUME
  private unlocked = false
  private queue: { name: SoundName; at: number }[] = []
  private readonly lastPlayedAt = new Map<SoundName, number>()
  private activeNotes = 0
  /** Tăng mỗi khi bỏ/đổi context: `onended` của nốt thuộc context cũ không được đụng bộ đếm của context mới. */
  private generation = 0
  private pendingUnlock: Promise<boolean> | null = null
  private readonly listeners = new Set<() => void>()
  private snapshot: AudioSnapshot = { muted: false, volume: DEFAULT_VOLUME, unlocked: false }

  constructor({
    createContext = defaultCreateContext,
    now = () => Date.now(),
    maxQueue = DEFAULT_MAX_QUEUE,
    queueTtlMs = DEFAULT_QUEUE_TTL_MS,
    minGapMs = DEFAULT_MIN_GAP_MS,
    maxActiveNotes = DEFAULT_MAX_ACTIVE_NOTES,
  }: AudioServiceOptions = {}) {
    this.createContext = createContext
    this.now = now
    this.maxQueue = maxQueue
    this.queueTtlMs = queueTtlMs
    this.minGapMs = minGapMs
    this.maxActiveNotes = maxActiveNotes
  }

  // ---- trạng thái (cho useSyncExternalStore) ----
  /** Ảnh chụp trạng thái; giữ nguyên danh tính đến khi có thay đổi thật. */
  getSnapshot = (): AudioSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private publish() {
    const next: AudioSnapshot = { muted: this.muted, volume: this.volume, unlocked: this.unlocked }
    const previous = this.snapshot
    if (next.muted === previous.muted && next.volume === previous.volume && next.unlocked === previous.unlocked) {
      return
    }
    this.snapshot = next
    for (const listener of [...this.listeners]) listener()
  }

  get isMuted(): boolean {
    return this.muted
  }

  get currentVolume(): number {
    return this.volume
  }

  get isUnlocked(): boolean {
    return this.unlocked
  }

  setMuted(muted: boolean) {
    this.muted = muted
    // Tắt tiếng cũng bỏ các lệnh đang chờ để bật lại không phát âm cũ, và cắt âm đang phát.
    if (muted) this.queue = []
    this.applyMasterGain()
    this.publish()
  }

  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : DEFAULT_VOLUME))
    this.applyMasterGain()
    this.publish()
  }

  private targetGain(): number {
    return this.muted ? 0 : this.volume * MASTER_HEADROOM
  }

  private applyMasterGain() {
    const { master, context } = this
    if (!master || !context) return
    const now = context.currentTime
    // Đường dốc ngắn từ giá trị hiện tại: êm hơn gán thẳng `value` (gán thẳng gây tiếng "tách").
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(this.targetGain(), now + GAIN_RAMP_SECONDS)
  }

  // ---- mở khóa và phát ----
  /**
   * Mở khóa âm thanh: dựng AudioContext (lần đầu) và `resume()`. PHẢI được gọi từ một cử chỉ người dùng
   * (chạm, bấm, phím) vì chính sách autoplay của trình duyệt. Trả `true` khi context đang chạy. Các lần gọi
   * đồng thời dùng chung một lượt (không dựng hai context).
   */
  unlock(): Promise<boolean> {
    if (this.pendingUnlock) return this.pendingUnlock
    const run = this.doUnlock().finally(() => {
      if (this.pendingUnlock === run) this.pendingUnlock = null
    })
    this.pendingUnlock = run
    return run
  }

  private async doUnlock(): Promise<boolean> {
    let context: AudioContextLike
    try {
      if (!this.context || this.context.state === 'closed') this.replaceContext(this.createContext())
      context = this.context as AudioContextLike
      await context.resume()
    } catch {
      this.unlocked = false
      this.publish()
      return false
    }
    // `dispose()` hoặc lượt khác đã đổi context trong lúc chờ: kết quả này không còn thuộc về ai.
    if (this.context !== context) return false
    this.unlocked = context.state === 'running'
    this.publish()
    if (this.unlocked) this.flushQueue()
    return this.unlocked
  }

  private replaceContext(context: AudioContextLike | null) {
    this.context = context
    this.master = null
    this.generation += 1
    this.activeNotes = 0
  }

  /**
   * Phát một âm. Trả `true` nếu đã lên lịch phát ngay. Tắt tiếng thì không làm gì. Chưa mở khóa (hoặc context bị
   * ngắt, ví dụ iOS) thì xếp hàng (giữ vài lệnh gần nhất, bỏ lệnh quá cũ) và phát khi mở khóa lại thành công;
   * KHÔNG tự dựng AudioContext, nhưng nếu context đã có thì thử `resume()` lại (hợp lệ khi gọi từ cử chỉ).
   */
  play(name: SoundName): boolean {
    if (this.muted) return false
    const at = this.now()
    const last = this.lastPlayedAt.get(name)
    if (last !== undefined && at - last < this.minGapMs) return false

    const context = this.context
    if (!context || context.state === 'closed') {
      this.enqueue(name, at)
      return false
    }
    if (context.state !== 'running') {
      if (this.unlocked) {
        this.unlocked = false
        this.publish()
      }
      this.enqueue(name, at)
      void this.unlock()
      return false
    }
    if (!this.unlocked) {
      this.unlocked = true
      this.publish()
    }
    return this.schedule(name, at)
  }

  /** Đóng AudioContext và bỏ mọi lệnh chờ. Dùng khi rời trang. */
  async dispose(): Promise<void> {
    const context = this.context
    this.queue = []
    this.pendingUnlock = null
    this.replaceContext(null)
    this.unlocked = false
    this.publish()
    if (context && context.state !== 'closed') {
      try {
        await context.close()
      } catch {
        // Đã đóng hoặc không đóng được: bỏ qua.
      }
    }
  }

  private enqueue(name: SoundName, at: number) {
    // Mỗi âm chỉ giữ lệnh mới nhất: bấm "Đúng" ba lần trước khi mở khóa không được thành chín nốt chồng nhau.
    this.queue = this.queue.filter((item) => item.name !== name)
    this.queue.push({ name, at })
    while (this.queue.length > this.maxQueue) this.queue.shift()
  }

  private flushQueue() {
    const at = this.now()
    const pending = this.queue.filter((item) => at - item.at <= this.queueTtlMs)
    this.queue = []
    for (const item of pending) this.schedule(item.name, at)
  }

  private ensureMaster(context: AudioContextLike): GainNodeLike {
    if (!this.master) {
      this.master = context.createGain()
      this.master.gain.value = this.targetGain()
      this.master.connect(context.destination)
    }
    return this.master
  }

  private schedule(name: SoundName, at: number): boolean {
    const context = this.context
    if (!context) return false
    const plan = soundPlan(name)
    if (this.activeNotes + plan.length > this.maxActiveNotes) return false

    const master = this.ensureMaster(context)
    const generation = this.generation
    const t0 = context.currentTime + START_LEAD_SECONDS
    for (const step of plan) {
      const oscillator = context.createOscillator()
      const envelope = context.createGain()
      const noteStart = t0 + step.start
      const noteEnd = noteStart + step.duration
      const stopAt = noteEnd + RELEASE_SECONDS

      oscillator.type = step.type
      oscillator.frequency.value = step.freq
      // Lên nhanh, giữ, rồi tắt dần về 0: không có bước nhảy biên độ nào gây tiếng "tách".
      envelope.gain.setValueAtTime(0, noteStart)
      envelope.gain.linearRampToValueAtTime(step.peak, noteStart + ATTACK_SECONDS)
      envelope.gain.setValueAtTime(step.peak, Math.max(noteStart + ATTACK_SECONDS, noteEnd))
      envelope.gain.linearRampToValueAtTime(0, stopAt)

      oscillator.connect(envelope)
      envelope.connect(master)
      this.activeNotes += 1
      oscillator.onended = () => {
        // Nốt của context đã bỏ: bộ đếm đã được đặt lại, không trừ nhầm vào context mới.
        if (generation === this.generation) this.activeNotes -= 1
        oscillator.disconnect()
        envelope.disconnect()
      }
      oscillator.start(noteStart)
      oscillator.stop(stopAt + 0.02)
    }
    this.lastPlayedAt.set(name, at)
    return true
  }
}

/** Trần tổng biên độ trong trường hợp xấu nhất, để test kiểm bất biến "không cắt đỉnh". */
export function worstCaseTotalPeak(maxActiveNotes: number = DEFAULT_MAX_ACTIVE_NOTES): number {
  return maxActiveNotes * MAX_PEAK * MASTER_HEADROOM
}

function defaultCreateContext(): AudioContextLike {
  const Ctor =
    window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) throw new Error('Trình duyệt không hỗ trợ Web Audio.')
  return new Ctor()
}

/**
 * Lắng nghe cử chỉ của người dùng để mở khóa âm thanh. Chỉ tự gỡ khi `unlock()` thành công: cử chỉ đầu tiên
 * có thể không được trình duyệt tính là "kích hoạt người dùng" (ví dụ `pointerdown` cảm ứng, phím Esc), nên các
 * cử chỉ sau phải được thử lại. Dùng `pointerup`/`click`/`touchend`/`keydown`, không dùng `pointerdown`.
 * Trả hàm gỡ thủ công.
 */
export function attachUnlockListeners(service: AudioService, target: EventTarget = document): () => void {
  const events = ['pointerup', 'click', 'touchend', 'keydown'] as const
  let attached = true
  const detach = () => {
    if (!attached) return
    attached = false
    for (const event of events) target.removeEventListener(event, onGesture, true)
  }
  const onGesture = () => {
    void service.unlock().then((ok) => {
      if (ok) detach()
    })
  }
  for (const event of events) target.addEventListener(event, onGesture, true)
  return detach
}

let shared: AudioService | null = null
/** Bản dùng chung của khu thử nghiệm (tạo lười, chưa dựng AudioContext cho tới khi `unlock()`). */
export function getAudioService(): AudioService {
  shared ??= new AudioService()
  return shared
}
