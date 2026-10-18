/** Số mẫu/giây mặc định của tệp WAV tự sinh (PCM 16-bit, một kênh). */
export const WAV_SAMPLE_RATE = 22050

export interface ToneWavOptions {
  freq: number
  seconds: number
  /** Biên độ đỉnh 0 đến 1. */
  peak: number
  sampleRate?: number
}

/** Thời gian lên/tắt (giây) của tệp tự sinh: không có tiếng «tách» ở hai đầu. */
const FADE_SECONDS = 0.01

/**
 * Sinh tệp WAV (PCM 16-bit, mono) của một nốt hình sin có lên/tắt nhanh. Dùng làm «tệp âm thanh» cho phép so Howler
 * (phát từ tệp) với Web Audio (tổng hợp) mà không cần tải tài nguyên ngoài. Hàm thuần.
 */
export function makeToneWav({ freq, seconds, peak, sampleRate = WAV_SAMPLE_RATE }: ToneWavOptions): Uint8Array {
  const samples = Math.max(1, Math.round(seconds * sampleRate))
  const bytes = new Uint8Array(44 + samples * 2)
  const view = new DataView(bytes.buffer)
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i))
  }
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true) // kích thước khối fmt
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte/giây
  view.setUint16(32, 2, true) // byte/khối
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, samples * 2, true)
  const level = Math.min(1, Math.max(0, peak))
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate
    const fade = Math.min(1, t / FADE_SECONDS, (seconds - t) / FADE_SECONDS)
    const value = Math.sin(2 * Math.PI * freq * t) * level * Math.max(0, fade)
    view.setInt16(44 + i * 2, Math.round(value * 32767), true)
  }
  return bytes
}
