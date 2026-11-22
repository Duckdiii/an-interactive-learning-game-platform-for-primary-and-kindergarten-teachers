import { useEffect, useState } from 'react'
import { viText } from '../../../constants/viText'
import { speakVietnamese } from '../../../services/pipeline/assetBank'

/**
 * "Nghe thử" lời đọc bằng giọng tiếng Việt có sẵn của trình duyệt (Web Speech API): miễn phí, không gọi backend. Giọng có thể
 * khác giọng TTS thật khi có; máy không có giọng tiếng Việt thì báo rõ thay vì im lặng đọc sai.
 */
export default function ListenPreviewButton({ id, text }: { id: string; text?: string }) {
  const t = viText.editor.form
  const [speaking, setSpeaking] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const content = text?.trim() ?? ''

  // Rời câu (component bị gỡ) khi đang đọc thì dừng, để không đọc đè lên câu khác.
  useEffect(() => {
    if (!speaking || !supported) return
    return () => window.speechSynthesis?.cancel()
  }, [speaking, supported])

  if (!supported) {
    return <p className="text-sm text-ink-soft">{t.listenUnsupported}</p>
  }

  const listen = () => {
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    // Danh sách giọng có thể chưa nạp xong (rỗng): khi đó không kết luận là thiếu giọng tiếng Việt.
    const voices = window.speechSynthesis.getVoices()
    setNote(voices.length > 0 && !voices.some((v) => v.lang.toLowerCase().startsWith('vi')) ? t.listenNoVietnameseVoice : null)
    setSpeaking(true)
    speakVietnamese(content, () => setSpeaking(false))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        id={id}
        type="button"
        onClick={listen}
        disabled={!content}
        aria-pressed={speaking}
        className="min-h-11 rounded-xl border-2 border-brand/30 bg-white px-4 text-sm font-bold text-brand transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-50"
      >
        {speaking ? t.listenStop : t.listen}
      </button>
      {!content ? <span className="text-sm text-ink-soft">{t.listenEmpty}</span> : null}
      <p className="text-sm text-ink-soft" aria-live="polite">
        {note}
      </p>
    </div>
  )
}
