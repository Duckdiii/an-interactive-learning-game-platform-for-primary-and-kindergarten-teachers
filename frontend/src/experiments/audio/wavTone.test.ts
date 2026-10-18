import { describe, expect, it } from 'vitest'
import { makeToneWav, WAV_SAMPLE_RATE } from './wavTone'

const tag = (bytes: Uint8Array, offset: number) => String.fromCharCode(...bytes.slice(offset, offset + 4))
const samples = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer)
  return Array.from({ length: (bytes.length - 44) / 2 }, (_, i) => view.getInt16(44 + i * 2, true))
}

describe('makeToneWav', () => {
  const wav = makeToneWav({ freq: 440, seconds: 0.1, peak: 0.5 })
  const view = new DataView(wav.buffer)

  it('đầu tệp WAV hợp lệ: RIFF/WAVE/fmt/data, PCM 16-bit mono', () => {
    expect(tag(wav, 0)).toBe('RIFF')
    expect(tag(wav, 8)).toBe('WAVE')
    expect(tag(wav, 12)).toBe('fmt ')
    expect(tag(wav, 36)).toBe('data')
    expect(view.getUint16(20, true)).toBe(1) // PCM
    expect(view.getUint16(22, true)).toBe(1) // mono
    expect(view.getUint32(24, true)).toBe(WAV_SAMPLE_RATE)
    expect(view.getUint32(28, true)).toBe(WAV_SAMPLE_RATE * 2)
    expect(view.getUint16(32, true)).toBe(2)
    expect(view.getUint16(34, true)).toBe(16)
  })

  it('kích thước trong đầu tệp khớp độ dài thật', () => {
    const count = Math.round(0.1 * WAV_SAMPLE_RATE)
    expect(wav.length).toBe(44 + count * 2)
    expect(view.getUint32(4, true)).toBe(wav.length - 8)
    expect(view.getUint32(40, true)).toBe(count * 2)
  })

  it('biên độ đỉnh đúng mức yêu cầu (không vượt) và hai đầu lên/tắt về gần 0 (không «tách»)', () => {
    const data = samples(wav)
    const peak = Math.max(...data.map(Math.abs)) / 32767
    expect(peak).toBeGreaterThan(0.45)
    expect(peak).toBeLessThanOrEqual(0.5 + 1e-3)
    expect(Math.abs(data[0])).toBeLessThan(50)
    expect(Math.abs(data[data.length - 1])).toBeLessThan(400)
  })

  it('tần số đúng: số lần đổi dấu trong 0,1 giây của 440 Hz ≈ 88', () => {
    const data = samples(makeToneWav({ freq: 440, seconds: 0.1, peak: 0.5 }))
    let crossings = 0
    for (let i = 1; i < data.length; i += 1) if (data[i - 1] < 0 !== data[i] < 0) crossings += 1
    expect(crossings).toBeGreaterThan(84)
    expect(crossings).toBeLessThan(92)
  })

  it('số mẫu làm tròn gần nhất (2,6 mẫu → 3), không cắt cụt', () => {
    expect((makeToneWav({ freq: 440, seconds: 2.6 / WAV_SAMPLE_RATE, peak: 0.5 }).length - 44) / 2).toBe(3)
  })

  it('biên độ ngoài khoảng được kẹp 0..1; thời lượng cực ngắn vẫn có ít nhất một mẫu', () => {
    const loud = samples(makeToneWav({ freq: 440, seconds: 0.1, peak: 1.2 }))
    const full = samples(makeToneWav({ freq: 440, seconds: 0.1, peak: 1 }))
    expect(loud).toEqual(full) // peak 1,2 được kẹp về 1 (không cuộn vòng 16-bit)
    expect(Math.max(...loud.map(Math.abs))).toBeGreaterThanOrEqual(32700)
    const silent = samples(makeToneWav({ freq: 440, seconds: 0.1, peak: -1 }))
    expect(silent.every((value) => value === 0)).toBe(true)
    expect(makeToneWav({ freq: 440, seconds: 0, peak: 0.5 }).length).toBe(46)
  })
})
