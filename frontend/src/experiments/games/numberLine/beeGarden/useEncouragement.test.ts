import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Speaker } from '../../../audio/browserSpeech'
import type { SpeechSynthesisLike, VoiceLike } from '../../../audio/ttsProbe'
import { ENCOURAGEMENT, ENCOURAGEMENT_DELAY_MS, pickPhrase, pickVietnameseVoice, useEncouragement } from './useEncouragement'

const voice = (name: string, lang: string, localService = true): VoiceLike => ({ name, lang, localService, default: false, voiceURI: name })

describe('pickPhrase', () => {
  it('xoay vòng qua các câu của từng loại và không bao giờ trả câu rỗng', () => {
    for (const kind of ['correct', 'tryAgain'] as const) {
      const list = ENCOURAGEMENT[kind]
      for (let i = 0; i < list.length * 2 + 1; i += 1) expect(pickPhrase(kind, i)).toBe(list[i % list.length])
      expect(pickPhrase(kind, -1)).toBe(list[list.length - 1])
    }
  })
  it('lời khen và lời rủ thử lại không chê, không phạt (không có «sai», «dở», «kém»)', () => {
    for (const phrase of [...ENCOURAGEMENT.correct, ...ENCOURAGEMENT.tryAgain]) expect(phrase).not.toMatch(/sai|dở|kém|tệ|ngốc/i)
    expect(ENCOURAGEMENT.correct).toContain('Giỏi quá!')
    expect(ENCOURAGEMENT.tryAgain).toContain('Thử lại nhé!')
  })
})

describe('pickVietnameseVoice', () => {
  it('chọn giọng tiếng Việt, ưu tiên giọng cài sẵn trong máy; không có giọng Việt thì undefined (không đọc bằng giọng nước khác)', () => {
    expect(pickVietnameseVoice([voice('Anna', 'en-US'), voice('An', 'vi-VN', false), voice('Linh', 'vi_VN', true)])?.name).toBe('Linh')
    expect(pickVietnameseVoice([voice('An', 'vi-VN', false)])?.name).toBe('An')
    expect(pickVietnameseVoice([voice('Anna', 'en-US'), voice('Jean', 'fr-FR')])).toBeUndefined()
    expect(pickVietnameseVoice([])).toBeUndefined()
  })
})

describe('useEncouragement', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const setup = (voices: VoiceLike[]) => {
    const speaker: Speaker = { speak: vi.fn(), cancel: vi.fn() }
    const synth: SpeechSynthesisLike = { getVoices: () => voices, addEventListener: vi.fn(), removeEventListener: vi.fn() }
    return { speaker, synth, hook: renderHook(() => useEncouragement({ speaker, synth })) }
  }

  it('có giọng Việt: hẹn đọc sau một nhịp rồi đọc đúng câu; câu thứ hai của cùng loại khác câu đầu', () => {
    const { speaker, hook } = setup([voice('Linh', 'vi-VN')])
    expect(hook.result.current.say('correct')).toBe(true)
    expect(speaker.speak).not.toHaveBeenCalled()
    act(() => void vi.advanceTimersByTime(ENCOURAGEMENT_DELAY_MS))
    expect(speaker.speak).toHaveBeenCalledWith(expect.objectContaining({ name: 'Linh' }), ENCOURAGEMENT.correct[0])
    hook.result.current.say('correct')
    act(() => void vi.advanceTimersByTime(ENCOURAGEMENT_DELAY_MS))
    expect(speaker.speak).toHaveBeenLastCalledWith(expect.anything(), ENCOURAGEMENT.correct[1])
  })

  it('nói câu mới trong lúc đang chờ thì chỉ đọc câu mới (không đọc dồn)', () => {
    const { speaker, hook } = setup([voice('Linh', 'vi-VN')])
    hook.result.current.say('correct')
    hook.result.current.say('tryAgain')
    act(() => void vi.advanceTimersByTime(ENCOURAGEMENT_DELAY_MS * 3))
    expect(speaker.speak).toHaveBeenCalledTimes(1)
    expect(speaker.speak).toHaveBeenCalledWith(expect.anything(), ENCOURAGEMENT.tryAgain[0])
  })

  it('không có giọng tiếng Việt, không có bộ đọc hoặc bị tắt: trả false và im lặng', () => {
    const none = setup([voice('Anna', 'en-US')])
    expect(none.hook.result.current.say('correct')).toBe(false)
    act(() => void vi.advanceTimersByTime(2000))
    expect(none.speaker.speak).not.toHaveBeenCalled()
    const off = renderHook(() => useEncouragement({ speaker: null, synth: null }))
    expect(off.result.current.say('tryAgain')).toBe(false)
  })

  it('đóng màn thì hủy câu đang chờ và dừng giọng đang đọc', () => {
    const { speaker, hook } = setup([voice('Linh', 'vi-VN')])
    hook.result.current.say('correct')
    hook.unmount()
    act(() => void vi.advanceTimersByTime(2000))
    expect(speaker.speak).not.toHaveBeenCalled()
    expect(speaker.cancel).toHaveBeenCalled()
  })

  it('trình duyệt ném lỗi khi đọc thì nuốt lỗi (không làm hỏng màn chơi)', () => {
    const { speaker, hook } = setup([voice('Linh', 'vi-VN')])
    vi.mocked(speaker.speak).mockImplementation(() => {
      throw new Error('not-allowed')
    })
    hook.result.current.say('correct')
    expect(() => act(() => void vi.advanceTimersByTime(ENCOURAGEMENT_DELAY_MS))).not.toThrow()
  })
})
