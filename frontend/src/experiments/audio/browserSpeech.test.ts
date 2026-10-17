import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { browserSpeaker, browserSynth } from './browserSpeech'
import type { VoiceLike } from './ttsProbe'

const voice = (name: string, lang: string, voiceURI = `uri:${name}`): VoiceLike => ({
  name,
  lang,
  voiceURI,
  localService: true,
  default: false,
})

class FakeUtterance {
  text: string
  lang = ''
  voice: VoiceLike | null = null
  constructor(text: string) {
    this.text = text
  }
}

function installFakeSpeech(options: { voices?: VoiceLike[]; speaking?: boolean; pending?: boolean } = {}) {
  const synth = {
    getVoices: vi.fn(() => options.voices ?? []),
    speak: vi.fn(),
    cancel: vi.fn(),
    speaking: options.speaking ?? false,
    pending: options.pending ?? false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true })
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  return synth
}

describe('browser speech (với speechSynthesis giả)', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'speechSynthesis')
  })
  afterEach(() => {
    Reflect.deleteProperty(window, 'speechSynthesis')
    vi.unstubAllGlobals()
  })

  describe('không hỗ trợ', () => {
    it('không có speechSynthesis: cả synth và speaker là undefined', () => {
      expect(browserSynth()).toBeUndefined()
      expect(browserSpeaker()).toBeUndefined()
    })

    it('có speechSynthesis nhưng thiếu SpeechSynthesisUtterance: có synth, không có speaker', () => {
      installFakeSpeech()
      vi.stubGlobal('SpeechSynthesisUtterance', undefined)
      expect(browserSynth()).toBeDefined()
      expect(browserSpeaker()).toBeUndefined()
    })
  })

  describe('speak', () => {
    it('tạo câu đọc đúng chữ, đúng giọng (khớp voiceURI) và mã ngôn ngữ, rồi gọi speak', () => {
      const real = voice('Linh', 'vi-VN')
      const synth = installFakeSpeech({ voices: [voice('Other', 'en-US'), real] })
      browserSpeaker()!.speak(voice('Linh', 'vi-VN'), 'Xin chào')
      expect(synth.speak).toHaveBeenCalledTimes(1)
      const utterance = synth.speak.mock.calls[0][0] as FakeUtterance
      expect(utterance.text).toBe('Xin chào')
      expect(utterance.lang).toBe('vi-VN')
      expect(utterance.voice).toBe(real)
    })

    it('voiceURI rỗng thì khớp theo tên + mã ngôn ngữ, không nhầm giọng đầu tiên', () => {
      const first = voice('Alpha', 'en-US', '')
      const second = voice('Beta', 'en-US', '')
      const synth = installFakeSpeech({ voices: [first, second] })
      browserSpeaker()!.speak(voice('Beta', 'en-US', ''), 'Hi')
      expect((synth.speak.mock.calls[0][0] as FakeUtterance).voice).toBe(second)
    })

    it('không tìm thấy giọng thì vẫn đọc bằng mã ngôn ngữ (không gán giọng)', () => {
      const synth = installFakeSpeech({ voices: [] })
      browserSpeaker()!.speak(voice('Ghost', 'vi-VN'), 'Chào')
      const utterance = synth.speak.mock.calls[0][0] as FakeUtterance
      expect(utterance.voice).toBeNull()
      expect(utterance.lang).toBe('vi-VN')
    })

    it('không có gì đang đọc thì KHÔNG gọi cancel (Chrome có thể nuốt câu mới)', () => {
      const synth = installFakeSpeech()
      browserSpeaker()!.speak(voice('A', 'en-US'), 'Hi')
      expect(synth.cancel).not.toHaveBeenCalled()
      expect(synth.speak).toHaveBeenCalledTimes(1)
    })

    it.each([
      ['đang đọc', { speaking: true }],
      ['đang xếp hàng', { pending: true }],
    ])('%s thì dừng câu cũ trước khi đọc câu mới', (_name, state) => {
      const synth = installFakeSpeech(state)
      const order: string[] = []
      synth.cancel.mockImplementation(() => order.push('cancel'))
      synth.speak.mockImplementation(() => order.push('speak'))
      browserSpeaker()!.speak(voice('A', 'en-US'), 'Hi')
      expect(order).toEqual(['cancel', 'speak'])
    })
  })

  it('cancel() chuyển thẳng tới speechSynthesis.cancel', () => {
    const synth = installFakeSpeech()
    browserSpeaker()!.cancel()
    expect(synth.cancel).toHaveBeenCalledTimes(1)
  })
})
