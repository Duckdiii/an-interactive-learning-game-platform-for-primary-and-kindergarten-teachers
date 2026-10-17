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

export interface AudioContextLike {
  readonly state: string
  readonly currentTime: number
  readonly destination: AudioNodeLike
  resume(): Promise<void>
  close(): Promise<void>
  createGain(): GainNodeLike
  createOscillator(): OscillatorNodeLike
}
