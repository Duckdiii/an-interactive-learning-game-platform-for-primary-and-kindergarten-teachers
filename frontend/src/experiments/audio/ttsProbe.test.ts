import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  classifyVoices,
  DEFAULT_PROBE_TIMEOUT_MS,
  escapeCell,
  formatReport,
  languageOf,
  localDateString,
  probeVoices,
  SAMPLE_TEXT,
  summarizeProbe,
  type ProbeResult,
  type SpeechSynthesisLike,
  type VoiceLike,
} from './ttsProbe'

const voice = (name: string, lang: string, overrides: Partial<VoiceLike> = {}): VoiceLike => ({
  name,
  lang,
  localService: true,
  default: false,
  voiceURI: `uri:${name}`,
  ...overrides,
})

/** `speechSynthesis` giả: danh sách giọng đổi được và phát sự kiện `voiceschanged` theo lệnh. */
class FakeSynth implements SpeechSynthesisLike {
  voices: VoiceLike[]
  getVoicesCalls = 0
  private readonly listeners = new Set<() => void>()
  constructor(voices: VoiceLike[] = []) {
    this.voices = voices
  }
  getVoices() {
    this.getVoicesCalls += 1
    return this.voices
  }
  addEventListener(_type: 'voiceschanged', listener: () => void) {
    this.listeners.add(listener)
  }
  removeEventListener(_type: 'voiceschanged', listener: () => void) {
    this.listeners.delete(listener)
  }
  get listenerCount() {
    return this.listeners.size
  }
  emit() {
    for (const listener of [...this.listeners]) listener()
  }
}

describe('languageOf', () => {
  it.each([
    ['vi-VN', 'vi'],
    ['vi_VN', 'vi'], // một số bản Android dùng gạch dưới
    ['VI-vn', 'vi'],
    ['vi', 'vi'],
    ['vie', 'vi'],
    ['  vi-VN  ', 'vi'],
    ['vi-VN-x-extra', 'vi'],
    ['en-US', 'en'],
    ['en_GB', 'en'],
    ['EN-au', 'en'],
    ['en', 'en'],
    ['eng', 'en'],
    ['fr-FR', 'other'],
    ['zh-CN', 'other'],
    ['', 'other'],
    ['vietnamese', 'other'],
    ['viet', 'other'],
    ['english', 'other'],
    ['e', 'other'],
  ] as const)('%j → %s', (lang, expected) => {
    expect(languageOf(lang)).toBe(expected)
  })
})

describe('classifyVoices', () => {
  it('tách tiếng Việt, tiếng Anh và đếm ngôn ngữ khác', () => {
    const result = classifyVoices([voice('A', 'en-US'), voice('B', 'vi-VN'), voice('C', 'fr-FR'), voice('D', 'ja-JP'), voice('E', 'vie')])
    expect(result.vi.map((v) => v.name)).toEqual(['B', 'E'])
    expect(result.en.map((v) => v.name)).toEqual(['A'])
    expect(result.otherCount).toBe(2)
  })

  it('sắp theo mã ngôn ngữ rồi theo tên', () => {
    const result = classifyVoices([voice('Zed', 'en-US'), voice('Amy', 'en-US'), voice('Bob', 'en-GB')])
    expect(result.en.map((v) => v.name)).toEqual(['Bob', 'Amy', 'Zed'])
  })

  it('rỗng thì mọi nhóm rỗng', () => {
    expect(classifyVoices([])).toEqual({ vi: [], en: [], otherCount: 0 })
  })

  it('không làm thay đổi mảng đầu vào', () => {
    const input = [voice('B', 'en-US'), voice('A', 'en-US')]
    classifyVoices(input)
    expect(input.map((v) => v.name)).toEqual(['B', 'A'])
  })
})

describe('probeVoices', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('trình duyệt không hỗ trợ (synth undefined)', async () => {
    await expect(probeVoices(undefined)).resolves.toEqual({ supported: false, timedOut: false, vi: [], en: [], otherCount: 0 })
  })

  it('có giọng ngay lần đọc đầu: không đăng ký trình nghe, không chờ', async () => {
    const synth = new FakeSynth([voice('A', 'vi-VN'), voice('B', 'en-US')])
    const result = await probeVoices(synth)
    expect(result).toMatchObject({ supported: true, timedOut: false })
    expect(result.vi).toHaveLength(1)
    expect(result.en).toHaveLength(1)
    expect(synth.listenerCount).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('danh sách rỗng lúc đầu: chờ voiceschanged rồi đọc lại và gỡ trình nghe', async () => {
    const synth = new FakeSynth()
    const promise = probeVoices(synth)
    expect(synth.listenerCount).toBe(1)
    synth.voices = [voice('A', 'vi-VN')]
    synth.emit()
    const result = await promise
    expect(result.vi.map((v) => v.name)).toEqual(['A'])
    expect(result.timedOut).toBe(false)
    expect(synth.listenerCount).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('sự kiện phát hai lần vẫn chỉ xong một lần', async () => {
    const synth = new FakeSynth()
    const promise = probeVoices(synth)
    synth.voices = [voice('A', 'en-US')]
    synth.emit()
    synth.emit()
    await expect(promise).resolves.toMatchObject({ supported: true })
    // Một lần đọc ban đầu + đúng một lần đọc lại khi xong; sự kiện thứ hai không kích hoạt đọc thêm.
    expect(synth.getVoicesCalls).toBe(2)
    expect(synth.listenerCount).toBe(0)
  })

  it('hết thời gian chờ mà vẫn rỗng: timedOut = true và gỡ trình nghe', async () => {
    const synth = new FakeSynth()
    const promise = probeVoices(synth, { timeoutMs: 1000 })
    await vi.advanceTimersByTimeAsync(999)
    expect(synth.listenerCount).toBe(1)
    await vi.advanceTimersByTimeAsync(1)
    const result = await promise
    expect(result).toMatchObject({ supported: true, timedOut: true, vi: [], en: [] })
    expect(synth.listenerCount).toBe(0)
  })

  it('hạn chờ mặc định', async () => {
    const synth = new FakeSynth()
    const promise = probeVoices(synth)
    await vi.advanceTimersByTimeAsync(DEFAULT_PROBE_TIMEOUT_MS)
    expect((await promise).timedOut).toBe(true)
  })

  it('hết hạn nhưng giọng đã về (không có sự kiện): liệt kê và không báo timedOut', async () => {
    const synth = new FakeSynth()
    const promise = probeVoices(synth, { timeoutMs: 500 })
    synth.voices = [voice('A', 'en-US')]
    await vi.advanceTimersByTimeAsync(500)
    const result = await promise
    expect(result.en).toHaveLength(1)
    expect(result.timedOut).toBe(false)
  })

  it('sự kiện tới nhưng danh sách vẫn rỗng: không phải timedOut', async () => {
    const synth = new FakeSynth()
    const promise = probeVoices(synth)
    synth.emit()
    expect(await promise).toMatchObject({ supported: true, timedOut: false, vi: [], en: [] })
  })

  describe('hủy', () => {
    it('hủy lúc đang chờ: từ chối AbortError, gỡ trình nghe và bộ hẹn giờ', async () => {
      const synth = new FakeSynth()
      const controller = new AbortController()
      const promise = probeVoices(synth, { signal: controller.signal })
      const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' })
      controller.abort()
      await assertion
      expect(synth.listenerCount).toBe(0)
      expect(vi.getTimerCount()).toBe(0)
    })

    it('đã hủy từ trước: từ chối ngay, không để lại trình nghe', async () => {
      const synth = new FakeSynth()
      const controller = new AbortController()
      controller.abort()
      await expect(probeVoices(synth, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
      expect(synth.listenerCount).toBe(0)
      expect(vi.getTimerCount()).toBe(0)
    })

    it('hủy sau khi đã xong thì không ảnh hưởng và không để lại gì treo', async () => {
      const synth = new FakeSynth()
      const controller = new AbortController()
      const promise = probeVoices(synth, { signal: controller.signal })
      synth.voices = [voice('A', 'en-US')]
      synth.emit()
      const result = await promise
      controller.abort()
      expect(result.en).toHaveLength(1)
      expect(synth.listenerCount).toBe(0)
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})

describe('summarizeProbe', () => {
  const result = (vi: VoiceLike[], en: VoiceLike[]): ProbeResult => ({ supported: true, timedOut: false, vi, en, otherCount: 0 })

  it('đếm giọng trên máy và từ xa, có hay không từng ngôn ngữ', () => {
    const summary = summarizeProbe(
      result([voice('A', 'vi-VN')], [voice('B', 'en-US'), voice('C', 'en-GB', { localService: false })]),
    )
    expect(summary).toEqual({ hasVietnamese: true, hasEnglish: true, localCount: 2, remoteCount: 1 })
  })

  it('không có giọng nào', () => {
    expect(summarizeProbe(result([], []))).toEqual({ hasVietnamese: false, hasEnglish: false, localCount: 0, remoteCount: 0 })
  })
})

describe('formatReport', () => {
  const env = { userAgent: 'TestBrowser/1.0', date: '2026-10-18' }
  const base: ProbeResult = {
    supported: true,
    timedOut: false,
    vi: [voice('Linh', 'vi-VN', { default: true })],
    en: [voice('Zira', 'en-US'), voice('Cloud|Voice', 'en-GB', { localService: false })],
    otherCount: 7,
  }

  it('không hỗ trợ: nói rõ và không có bảng', () => {
    const text = formatReport({ supported: false, timedOut: false, vi: [], en: [], otherCount: 0 }, env)
    expect(text).toContain('KHÔNG hỗ trợ')
    expect(text).not.toContain('| Tên |')
  })

  it('ghi ngày, trình duyệt, số giọng và các bảng', () => {
    const text = formatReport(base, env)
    expect(text).toContain('2026-10-18')
    expect(text).toContain('TestBrowser/1.0')
    expect(text).toContain('Tiếng Việt: có. Tiếng Anh: có.')
    expect(text).toContain('Giọng trên máy: 2, giọng từ xa: 1')
    expect(text).toContain('Giọng ngôn ngữ khác (không liệt kê): 7')
    expect(text).toContain('| Linh | vi-VN | trên máy | có |')
    expect(text).toContain('| Zira | en-US | trên máy |  |')
  })

  it('tên giọng có ký tự | được thoát để bảng không vỡ', () => {
    expect(formatReport(base, env)).toContain('| Cloud\\|Voice | en-GB | từ xa |  |')
  })

  it('có giọng từ xa thì cảnh báo dữ liệu trẻ em; không có thì không cảnh báo', () => {
    expect(formatReport(base, env)).toContain('máy chủ bên thứ ba')
    const local = { ...base, en: [voice('Zira', 'en-US')] }
    expect(formatReport(local, env)).not.toContain('máy chủ bên thứ ba')
  })

  it('thiếu tiếng Việt: ghi KHÔNG có và nói bảng rỗng', () => {
    const text = formatReport({ ...base, vi: [] }, env)
    expect(text).toContain('Tiếng Việt: KHÔNG có')
    expect(text).toContain('**Tiếng Việt:** không có giọng nào.')
  })

  it('hết thời gian chờ thì có ghi chú', () => {
    expect(formatReport({ ...base, timedOut: true, vi: [], en: [] }, env)).toContain('chưa nạp giọng')
    expect(formatReport(base, env)).not.toContain('chưa nạp giọng')
  })

  it('luôn nhắc giới hạn của kết quả (một máy, chưa thử thiết bị di động)', () => {
    expect(formatReport(base, env)).toContain('Chưa kiểm chứng trên điện thoại')
  })

  it('tên/mã ngôn ngữ có xuống dòng hoặc dấu \\ không làm vỡ bảng: mỗi giọng đúng một dòng', () => {
    const text = formatReport(
      { ...base, vi: [voice('Dòng\nHai  khoảng\ttrắng', 'vi-VN'), voice('Cuối\\', 'vi\nVN')], en: [] },
      env,
    )
    const rows = text.split('\n').filter((line) => line.startsWith('| ') && !line.startsWith('| Tên') && !line.startsWith('|---'))
    expect(rows).toHaveLength(2)
    expect(rows[0]).toContain('| Dòng Hai khoảng trắng | vi-VN |')
    expect(rows[1]).toContain('| Cuối\\\\ | vi VN |')
  })

  it('userAgent nhiều dòng được gộp thành một dòng', () => {
    expect(formatReport(base, { ...env, userAgent: 'A\n  B\tC' })).toContain('Trình duyệt: A B C')
  })

  it('nhắc giới hạn: đọc lần đầu, cờ "trên máy" do trình duyệt tự khai', () => {
    const text = formatReport(base, env)
    expect(text).toContain('tại thời điểm đọc đầu tiên')
    expect(text).toContain('do trình duyệt tự khai')
  })
})

describe('escapeCell', () => {
  it.each([
    ['Plain', 'Plain'],
    ['a|b', 'a\\|b'],
    ['a\\b', 'a\\\\b'],
    ['  trim  me ', 'trim me'],
    ['x\ny\r\nz', 'x y z'],
    ['\\|', '\\\\\\|'],
    ['', ''],
  ])('%j → %j', (input, expected) => {
    expect(escapeCell(input)).toBe(expected)
  })
})

describe('localDateString', () => {
  it.each([
    [new Date(2026, 9, 18, 0, 30), '2026-10-18'], // đầu ngày giờ máy (UTC còn là 17 ở múi giờ +7)
    [new Date(2026, 0, 5, 23, 59), '2026-01-05'], // đệm số 0
    [new Date(2026, 11, 31, 12, 0), '2026-12-31'],
    [new Date(2028, 1, 29, 8, 0), '2028-02-29'], // năm nhuận
  ])('%s → %s', (date, expected) => {
    expect(localDateString(date)).toBe(expected)
  })
})

describe('SAMPLE_TEXT', () => {
  it('có câu đọc thử cho cả hai ngôn ngữ, ngắn và không có chỗ chèn dữ liệu', () => {
    for (const text of Object.values(SAMPLE_TEXT)) {
      expect(text.length).toBeGreaterThan(10)
      expect(text.length).toBeLessThan(120)
      expect(text).not.toMatch(/[{}$<>]/)
    }
    expect(SAMPLE_TEXT.vi).not.toBe(SAMPLE_TEXT.en)
  })
})
