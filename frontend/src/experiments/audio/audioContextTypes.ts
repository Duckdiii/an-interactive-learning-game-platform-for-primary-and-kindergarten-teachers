/**
 * Phần của Web Audio API mà `AudioService` dùng, để thay bằng bản giả khi test (jsdom không có Web Audio).
 * `AudioContext` thật gán được vào các kiểu này.
 */
export interface AudioParamLike {
  value: number
  setValueAtTime(value: number, time: number): unknown
  linearRampToValueAtTime(value: number, time: number): unknown
}

export interface AudioNodeLike {
  connect(destination: AudioNodeLike): unknown
  disconnect(): unknown
}

export interface GainNodeLike extends AudioNodeLike {
  readonly gain: AudioParamLike
}

export interface OscillatorNodeLike extends AudioNodeLike {
  type: OscillatorType
  readonly frequency: AudioParamLike
  onended: ((event: Event) => unknown) | null
  start(when?: number): void
  stop(when?: number): void
}

export interface StereoPannerNodeLike extends AudioNodeLike {
  /** -1 hoàn toàn trái, 0 giữa, 1 hoàn toàn phải. */
  readonly pan: AudioParamLike
}

export interface BiquadFilterNodeLike extends AudioNodeLike {
  type: BiquadFilterType
  readonly frequency: AudioParamLike
  readonly Q: AudioParamLike
}

export interface AudioBufferLike {
  getChannelData(channel: number): Float32Array
}

export interface AudioBufferSourceNodeLike extends AudioNodeLike {
  buffer: AudioBufferLike | null
  loop: boolean
  start(when?: number): void
  stop(when?: number): void
}

export interface AudioContextLike {
  readonly state: string
  readonly currentTime: number
  readonly sampleRate: number
  readonly destination: AudioNodeLike
  resume(): Promise<void>
  close(): Promise<void>
  createGain(): GainNodeLike
  createOscillator(): OscillatorNodeLike
  createStereoPanner(): StereoPannerNodeLike
  createBiquadFilter(): BiquadFilterNodeLike
  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike
  createBufferSource(): AudioBufferSourceNodeLike
}
