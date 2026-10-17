import type { SpeechSynthesisLike, VoiceLike } from './ttsProbe'

/** Đọc thử một câu bằng một giọng. Tách ra để `TtsProbe` nhận bản giả khi test. */
export interface Speaker {
  speak(voice: VoiceLike, text: string): void
  cancel(): void
}

/** `speechSynthesis` của trình duyệt, hoặc `undefined` nếu không hỗ trợ (hoặc không có `window`). */
export function browserSynth(): SpeechSynthesisLike | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined
  return window.speechSynthesis
}

/** Bộ đọc thật; `undefined` nếu trình duyệt không có `SpeechSynthesisUtterance`. */
export function browserSpeaker(): Speaker | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return undefined
  }
  const synth = window.speechSynthesis
  return {
    speak(voice, text) {
      const utterance = new SpeechSynthesisUtterance(text)
      const voices = synth.getVoices()
      // Ưu tiên khớp voiceURI; giọng có voiceURI rỗng/trùng thì khớp theo tên + mã ngôn ngữ.
      const real =
        voices.find((candidate) => candidate.voiceURI !== '' && candidate.voiceURI === voice.voiceURI) ??
        voices.find((candidate) => candidate.name === voice.name && candidate.lang === voice.lang)
      if (real) utterance.voice = real
      utterance.lang = voice.lang
      // Chỉ dừng khi đang đọc dở: gọi cancel() ngay trước speak() lúc không có gì đang đọc có thể làm Chrome nuốt câu mới.
      if (synth.speaking || synth.pending) synth.cancel()
      synth.speak(utterance)
    },
    cancel() {
      synth.cancel()
    },
  }
}
