import { useEffect, useMemo, useRef } from 'react'
import { browserSpeaker, browserSynth, type Speaker } from '../../../audio/browserSpeech'
import { languageOf, type SpeechSynthesisLike, type VoiceLike } from '../../../audio/ttsProbe'

/**
 * Lời động viên bằng giọng đọc của trình duyệt (Web Speech API), chưa dùng tệp âm thanh thu sẵn: đúng thì khen, chưa đúng thì rủ thử lại nhẹ nhàng
 * (không phạt, không chê). Máy không có giọng tiếng Việt (hoặc không hỗ trợ Web Speech) thì IM LẶNG, không đọc bằng giọng nước khác;
 * phần hình và nốt nhạc vẫn chạy bình thường. Đây là một «móc» (hook) chờ tệp giọng thu sẵn để thay thế sau.
 */
export type EncouragementKind = 'correct' | 'tryAgain'

export const ENCOURAGEMENT: Readonly<Record<EncouragementKind, readonly string[]>> = {
  correct: ['Giỏi quá!', 'Hay lắm!', 'Đúng rồi, giỏi quá!'],
  tryAgain: ['Thử lại nhé!', 'Gần đúng rồi, mình đếm cùng nhau nhé!'],
}

/** Chờ một chút để nốt «đúng» hoặc «thử lại» phát xong rồi mới đọc (khỏi chồng tiếng). */
export const ENCOURAGEMENT_DELAY_MS = 450

/** Câu thứ `counter` của loại `kind`, xoay vòng để trẻ không nghe mãi một câu. */
export function pickPhrase(kind: EncouragementKind, counter: number): string {
  const phrases = ENCOURAGEMENT[kind]
  return phrases[((Math.trunc(counter) % phrases.length) + phrases.length) % phrases.length]
}

/** Giọng tiếng Việt để đọc: ưu tiên giọng cài sẵn trong máy (nghe ngay, không cần mạng), rồi tới giọng khác; không có thì `undefined`. */
export function pickVietnameseVoice(voices: readonly VoiceLike[]): VoiceLike | undefined {
  const vietnamese = voices.filter((voice) => languageOf(voice.lang) === 'vi')
  return vietnamese.find((voice) => voice.localService) ?? vietnamese[0]
}

export interface Encouragement {
  /** Hẹn đọc một câu động viên; `false` nếu không đọc được (không hỗ trợ hoặc không có giọng tiếng Việt). Đọc câu mới thì dừng câu cũ. */
  say: (kind: EncouragementKind) => boolean
  cancel: () => void
}

interface Options {
  /** Thay được trong test; `null` là tắt hẳn. Mặc định lấy từ trình duyệt. */
  speaker?: Speaker | null
  synth?: SpeechSynthesisLike | null
}

export function useEncouragement({ speaker, synth }: Options = {}): Encouragement {
  const resolved = useMemo(() => ({ speaker: speaker === undefined ? browserSpeaker() : speaker, synth: synth === undefined ? browserSynth() : synth }), [speaker, synth])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Đếm riêng từng loại để lời khen và lời rủ thử lại mỗi loại xoay vòng độc lập.
  const counters = useRef<Record<EncouragementKind, number>>({ correct: 0, tryAgain: 0 })
  const cancel = useMemo(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = null
      resolved.speaker?.cancel()
    },
    [resolved],
  )
  useEffect(() => cancel, [cancel])
  return useMemo<Encouragement>(
    () => ({
      cancel,
      say: (kind) => {
        const voice = resolved.synth ? pickVietnameseVoice(resolved.synth.getVoices()) : undefined
        if (!resolved.speaker || !voice) return false
        if (timer.current !== null) clearTimeout(timer.current)
        const phrase = pickPhrase(kind, counters.current[kind])
        counters.current[kind] += 1
        timer.current = setTimeout(() => {
          timer.current = null
          try {
            resolved.speaker?.speak(voice, phrase)
          } catch {
            // lời động viên chỉ là phần thêm: trình duyệt từ chối đọc thì thôi, không làm hỏng màn chơi
          }
        }, ENCOURAGEMENT_DELAY_MS)
        return true
      },
    }),
    [resolved, cancel],
  )
}
